function contentClickCallback(id) {
	const response = await fetch('/assortment-profile', {
		method: 'POST',
		body: `id=${id}`,
		headers: {
			'X-Requested-With': 'XMLHttpRequest',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		credentials: 'same-origin'
	});
	
	const json = await response.json();
	
	/*	For example open profile in another part of the page */
}