const noMk = str => str && str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const parseInput = input => [...input.matchAll(/[^\s"]+|"([^"]*)"/g)].map(match => {
	if (typeof match[1] === 'undefined') {
		return match[0];
	} else if (match[1] === "") {
		return null;
	} else {
		return match[1];
	}
});

module.exports = {
	noMk,
	parseInput,
}