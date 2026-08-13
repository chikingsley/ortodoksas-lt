UPDATE `article_revisions`
SET `metadata_json` = json_set(
	json_remove(
		`metadata_json`,
		'$.heroMediaId',
		'$.kind',
		'$.labels',
		'$.publishedAt',
		'$.section',
		'$.seoDescription',
		'$.seoTitle',
		'$.sourceArticleId',
		'$.sourceCapture',
		'$.sourceUrl',
		'$.translationGroupId',
		'$.translationKind',
		'$.translationReviewedAt',
		'$.translationReviewedBy',
		'$.translationReviewStatus',
		'$.translationSourceArticleId',
		'$.translationSourceHash'
	),
	'$.snapshotCompleteness',
	'legacy_partial'
)
WHERE coalesce(json_extract(`metadata_json`, '$.snapshotCompleteness'), '') <> 'complete';
