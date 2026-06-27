WITH RECURSIVE

cte AS (
	SELECT
		A_1.`id`										,
		A_1.`assortment_id`								,
		A_1.`category_or_product`						,
		A_1.`parent`									,
		A_1.`sorting`									,
		A_1.`number`									,
		A_2.`sorting` 				AS parent_sorting	,
		0 							AS level            ,
        
        CAST(A_1.category_or_product AS CHAR(1000)) COLLATE utf8mb4_unicode_520_ci AS path
	
	FROM
		`assortments` AS A_1
	
	JOIN
		`assortments` AS A_2 	ON 			A_1.`assortment_id` 	= A_2.`assortment_id`
									AND 	A_1.`parent` 			= A_2.`category_or_product`
	
	WHERE
		A_1.`assortment_id` 					= ?
		AND A_1.`parent` 						= 0
		AND (		A_1.`category_or_product` 	!= 0
				OR 	A_1.`parent` 				!= 0
			)
	
	UNION ALL

	SELECT
		A.`id`									    	                    ,
		A.`assortment_id`							    	               	,
		A.`category_or_product`					    	                    ,
		A.`parent`								    	                    ,
		A.`sorting`								    	                    ,
		A.`number`                                                          ,
		cte.sorting 					                AS parent_sorting	,
		cte.level + 1 					                AS level            ,
        CONCAT(cte.path, ',', A.`category_or_product`)  AS path
	
	FROM
		`assortments` AS A
	
	JOIN
		cte 	ON 			A.`assortment_id` 	= cte.assortment_id
					AND 	A.`parent` 			= cte.category_or_product
    
    WHERE           FIND_IN_SET(A.`category_or_product`, cte.path) = 0
            AND     cte.level < 10
)

SELECT
	cte.id																				AS id						,
	cte.assortment_id																	AS assortment_id			,
	cte.category_or_product																AS category_or_product		,
	cte.parent																			AS parent					,
	cte.sorting																			AS sorting					,
	cte.number																			AS number					,
	cte.parent_sorting																	AS parent_sorting			,
	cte.level																			AS level					,
	COALESCE(P_C.`id`, P.`id`) 															AS category_or_product_id	,
	COALESCE(P_C.`name`, P.`name`, '') 													AS name						,
	COALESCE(P_C.`short_description`, P.`short_description`, '') 						AS short_description		,
	IF(P_C.`id` IS NOT NULL, 'category', IF(P.`id` IS NOT NULL, 'product', NULL)) 		AS entity                   ,
    cte.path 																			AS path

FROM
	cte

LEFT JOIN
	`product_categories` 	AS P_C 	ON cte.category_or_product 	= P_C.`id`

LEFT JOIN
	`products` 				AS P 	ON cte.category_or_product 	= P.`id`

ORDER BY
	level,
	CASE
		WHEN parent_sorting = 'number'
			THEN number
		ELSE
			IF(category_or_product_id IS NULL, 1, IF(entity = 'category', 2, 3))
	END,
	name,
	category_or_product_id
;