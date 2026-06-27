<?php
    if (($uri === '/assortment-profile' || $uri === '/add-assortment') && isset($_POST['id'])) {
        $response   = [];
        $id         = (int) $_POST['id'];
        
        $response['category'] = mysqli_fetch_assoc(get_product_category_profile($link, $id));
		
        if ($response['category']) {
            $thumbnail = get_thumbnail(get_main_photo('product_categories', $id));
            
        } else {
            $response['product'] = mysqli_fetch_assoc(get_product_profile($link, $id));
            
            $thumbnail = get_thumbnail(get_main_photo('products', $id));
        }
        
		if ($thumbnail) {
			$response['thumbnail'] = make_media_link_correct($thumbnail);
		}
		
		header('Content-Type: application/json; charset=utf-8');
		header('Cache-Control: no-store');
        
		echo json_encode($response);
		
		die();
	}
?>