<?php
	$id 					= (int) $_GET['id'];
	
	$assortment_structure 	= get_assortment_profile_structure($link, $id);
	
    $row 					= mysqli_fetch_assoc($assortment_structure);
	
    $parentSorting 			= $row['parent_sorting'];
	
    mysqli_data_seek($assortment_structure, 0);
?>

<div class="graph graph--profile" data-root-sorting="<?= e_attr($parentSorting) ?>">
	<?php
	while ($node = mysqli_fetch_assoc($assortment_structure)) {
		$node['parent'] 	            = (int) $node['parent'];
		$node['category_or_product'] 	= (int) $node['category_or_product'];
		$nodeType                       = '';
		
		if ($node['entity'] === 'category') {
			$thumbnail      = get_thumbnail(get_main_photo('product_categories', $node['category_or_product']));
			
			$linkClass      = 'link--product-category';
			$linkHref       = '/product-category-profile?id=' . $node['category_or_product'];
			
		} elseif ($node['entity'] === 'product') {
			$thumbnail      = get_thumbnail(get_main_photo('products', $node['category_or_product']));
			
			$linkClass      = 'link--product';
			$linkHref       = '/product-profile?id=' . $node['category_or_product'];
			
			$nodeType       = 'leaf';
			
		} else {
			$thumbnail      = null;
			
			$linkClass      = 'link--product-category';
			$linkHref       = '';
			
			$nodeType       = 'error';
			
		}
		?>
		
		<div class="graph__vertex"
			data-parent="<?=        $node['parent'] === 0 ? '' : $node['parent']                ?>"
			data-id="<?=            $node['category_or_product']                                ?>"
			data-sorting="<?=       isset($node['sorting']) ? e_attr($node['sorting']) : ''     ?>"
			data-node-type="<?=     $nodeType                                                   ?>"
		>
			<div class="graph__content">
				<a class="link <?= $linkClass ?>" href="<?= $linkHref ?>">
					<span class="link__name">
						<?= e($node['name']) ?>
					</span>
					
					<span class="link__id">
						<?= number_format($node['category_or_product'], 0, '', '&nbsp;') ?>
					</span>
					
					<span class="link__description">
						<?= e($node['short_description']) ?>
					</span>
					
					<?php
					if (isset($thumbnail)) {
						?>
						<div class="link__image-wrapper">
							<img class="link__image" src="<?= make_media_link_correct($thumbnail) ?>">
						</div>
						<?php
					}
					?>
				</a>
			</div>
		</div>
		<?php
	}
	?>
</div>