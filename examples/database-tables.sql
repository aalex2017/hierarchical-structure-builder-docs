CREATE TABLE product_categories
(
	id						INT				PRIMARY KEY	,
	name					VARCHAR(1000) 	NOT NULL 	,
	short_description 		TEXT			NOT NULL	,
	detailed_description	TEXT			NOT NULL
	
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;



CREATE TABLE products
(
	id						INT				PRIMARY KEY	,
	name					VARCHAR(1000) 	NOT NULL 	,
	short_description 		TEXT			NOT NULL	,
	detailed_description	TEXT			NOT NULL
	
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;



CREATE TABLE assortments
(
	id						INT							PRIMARY KEY AUTO_INCREMENT	,
	assortment_id			INT							NOT NULL					,
	category_or_product		INT							NOT NULL DEFAULT 0			,
	parent					INT							NOT NULL DEFAULT 0			,
	sorting 				ENUM('number','alphabet') 	NOT NULL DEFAULT 'alphabet'	,
	number					INT							NOT NULL DEFAULT 1			,
	
	UNIQUE (assortment_id, category_or_product, parent)
	
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;



ALTER TABLE assortments ADD CONSTRAINT check_assortments_category_or_product_parent_not_equal CHECK((category_or_product != parent) OR (category_or_product = 0 AND parent = 0));

