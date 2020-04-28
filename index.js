#!/usr/bin/env node

'use strict'
const fs = require('fs');
const fsp = fs.promises;
const fse = require('fs-extra');

const _ = require('lodash');
const chalk = require('chalk');
const dirTree = require('directory-tree');
const FuzzySearch = require('fuzzy-search');
const taglib = require('taglib3');
const inquirer = require('inquirer');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
const argv = require('minimist')(process.argv.slice(2));

const db = require('./db.json');
const flatter = require('./lib/flatters');
const utils = require('./lib/utils');

const ROOT = argv._[0] || ".";

const allowedExtensions = [".flac", ".mp3", ".wav"];

const tree = dirTree(ROOT);
const paths = flatter.flattenPaths(tree);
const pieces = flatter.nearFlattenDb(db);

const searcher = new FuzzySearch(pieces, ['searchable']);

const search = (answers, input) => {
	if (!input) return new Promise(resolve => resolve(pieces));
	input = utils.noMk(input);
	let parsedInput = utils.parseInput(input);

	return new Promise(resolve => {
		let result = [];
		parsedInput.forEach((input, index) => {
			if (index === 0) result = searcher.search(input);
			else result = _.intersectionBy(result, searcher.search(input), 'id');
		});
		resolve(result);
	});
};

const question = {
	metadata_select: {
		type: "list",
		name: "metadata",
		message: "Select:",
		choices: pieces,
	},
	metadata: {
		type: "autocomplete",
		name: "metadata",
		message: "Enter:",
		source: search,
	},
	manual: {
		type: "list",
		name: "manual",
		message: "Tweak manually?",
		choices: ["No", "Yes"],
	},
	rename: {
		type: "list",
		name: "rename",
		message: "Rename file?",
		choices: ["No", "Yes"],
	},
	field: {
		type: "input",
		name: "field",
		message: "Field (enter nothing to end):",
	},
	value: {
		type: "input",
		name: "value",
		message: "Value:",
	},
};

(async () => {
	for (const musicFile of paths) {
		const isAllowedMusicFile = allowedExtensions.includes(musicFile.extension);
		console.log(`${chalk.green("➤".repeat(musicFile.depth))} ${musicFile.name}${isAllowedMusicFile ? "" : ` ${chalk.gray("Skipped")}`}`);
		if (isAllowedMusicFile) {
			console.log("Current tags:", taglib.readTagsSync(musicFile.path));
			let answer = await inquirer.prompt([question.metadata, question.manual]);

			let willRenameFile = true;
			if (!answer.metadata.skip) {
				taglib.writeTagsSync(musicFile.path, {
					TITLE: [answer.metadata.title],
					ARTIST: [answer.metadata.composer.last],
					ALBUM: [answer.metadata.workTitle],
				});
				console.log("Updated tags:", taglib.readTagsSync(musicFile.path));
			} else {
				let willRenameResponse = await inquirer.prompt([question.rename]);
				if (willRenameResponse.rename === "No") willRenameFile = false;
			}

			if (answer.manual === "Yes") {
				while (true) {
					let manualEntry = await inquirer.prompt([question.field, question.value]);
					if (!manualEntry.field) break;

					taglib.writeTagsSync(musicFile.path, {
						[manualEntry.field]: [manualEntry.value],
					});
					console.log("Custom tags:", taglib.readTagsSync(musicFile.path));
				}
			}

			if (willRenameFile) {
				let tags = taglib.readTagsSync(musicFile.path);
				fs.renameSync(musicFile.path, `${musicFile.path.slice(0, -musicFile.name.length)}${tags.ARTIST} ${tags.TITLE}${musicFile.extension}`);
			}
		}
	}
})();
