module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			['merge', 'chore', 'ci', 'docs', 'review', 'feat', 'fix', 'debug', 'perf', 'refactor', 'revert'],
		],
	},
};
