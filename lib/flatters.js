const _ = require('lodash');
const inquirer = require('inquirer');

const utils = require('./utils');
const { noMk } = utils;

const _flattenPaths = (tree, arr = [], depth) => {
	arr.push({ path: tree.path, type: tree.type, name: tree.name, extension: tree.extension, depth });
	if (tree.children) {
		tree.children.forEach(child => _flattenPaths(child, arr, depth + 1));
	}
};

const flattenPaths = (tree) => {
	const arr = [];
	_flattenPaths(tree, arr, 0);
	return arr;
};

var COUNT = 0;

const _nearFlattenDb = ({ arr, work, workTitle, section, searchable, composer, upperSection = work, upperSectionString = "" }) => {
	let sectionString = `${upperSectionString ? `${upperSectionString} ` : ""}${work.sectionType} ${section.index}`;
	let nameString = `${section.name ? ` – ${section.name}` : ""}`;
	//no nick field; name includes everything
	let subTitle = `${work.name}, ${sectionString}${nameString}`;
	let subSearchable = searchable.concat([noMk(sectionString), noMk(section.name)]);
	let entry = {
		name: subTitle,
		value: {
			...section,
			sectionType: upperSection.sectionType,
			title: subTitle,
			workTitle,
			composer,
		},
		id: COUNT++,
		searchable: subSearchable,
	};
	arr.push(entry);

	if (section.hasSections) {
		section.sections.forEach(subsection => {
			_nearFlattenDb({ arr, work, workTitle, section: subsection, searchable: subSearchable, composer, upperSection: section, upperSectionString: sectionString });
		});
	}
}

const nearFlattenDb = (db) => {
	const arr = [];
	COUNT = 0;
	db.composers.forEach(composer => {
		arr.push(new inquirer.Separator(`${composer.name.fore} ${composer.name.last}`));
		composer.works.forEach(work => {
			let keyString = `${work.key ? ` in ${work.key}` : ""}`;
			let catalogueString = `${work.catalogue ? `, ${work.catalogue[0].type} ${work.catalogue[0].index}` : ""}`;
			let nickString = `${work.nick ? ` – ${work.nick}` : ""}`;
			let title = `${work.name}${keyString}${catalogueString}${nickString}`;
			let searchable = [
				noMk(composer.name.last),
				noMk(work.name),
				noMk(work.nick),
				noMk(work.key),
				work.catalogue.map(element => noMk(`${element.type} ${element.index}`)),
			];
			let entry = {
				name: title,
				value: {
					..._.omit(work, ['hasSections', 'sectionType', 'sections']),
					title,
					workTitle: title,
					composer: composer.name,
				},
				id: COUNT++,
				searchable,
			};
			arr.push(entry);

			if (work.hasSections) {
				work.sections.forEach(section => {
					_nearFlattenDb({ arr, work, workTitle: title, section, searchable, composer: composer.name });
				});
			}
		});
	});
	arr.push({
		name: "Skip",
		value: {
			skip: true,
		},
		searchable: ["skip"],
	});
	return arr;
};

module.exports = {
	flattenPaths,
	nearFlattenDb,
};