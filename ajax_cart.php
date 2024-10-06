<?php
include("dbconfig.php");

if(isset($_POST['action']) && isset($_POST['rand'])){

	// This block used for security. Match random num that generate on product list page
	//if($_POST['rand'] == $_SESSION['rand'])
	//{
		$value = $_POST['action'];
		
		switch($value){
			case "AddProduct":
				_AddProduct();	
			break;
		}
	//}
}

function get_array_key($element,$array){
	$key = array_search($element,$array);
	return $key;
}
// add products in cart
function _AddProduct()
{
    global $db,$dbcon;
    //print_r($db);
    //print_r($dbcon);
	// get values
	$msg = 0;

	$productid = $_POST['product_id'];
	$shop_cart_type = $_POST['shop_cart_type'];
	$product_qty = $_POST['qty'];
	$product_color = $_POST['color_name'];
	$product_size = $_POST['size_name'];
  $uuid = $_POST['rand'];
  $mockup_image = $_POST['image'];
	
	// get product information like qty and  price
	// ."' and p_qty >=".$product_qty
	//$db=new DBConnection();
	$sql = "select p_qty, cost_price from product_category where p_cat_id='".$productid."'";
	
	$rst = $db->query_execute($sql);
	$args_product = $db->get_all_row($rst);
	//print_r($_SESSION['shopping_cart_price']); exit;
	if($args_product)
	{
		if($shop_cart_type == "shopping_cart")
		{
      $_SESSION['uuid'] = $uuid;

      $sql_temp = "INSERT INTO design_lab (product_category_id, mockup_image, uuid) VALUES ('$productid', '$mockup_image', '$uuid')";
	    $db->query_execute($sql_temp);
	
			// check market place object already created or not if not New object will create and store that address in session else old object address store from seeion
			if(isset($_SESSION['shopping_cart_product']))
			{
				if(!in_array($productid,$_SESSION['shopping_cart_product']))
				{
                    if($args_product['product_price'])
                    {
                        $_SESSION['shopping_cart_price'][] = $args_product['product_price'];
                    }
                    else
                    {
                        $_SESSION['shopping_cart_price'][] = $args_product['cost_price'];
                    }
					// get exists list of products and his qty and price
					$_SESSION['shopping_cart_product'][] = $productid;
					$_SESSION['shopping_cart_size'][$productid][] = $product_size;
					$_SESSION['shopping_cart_color'][$productid][$product_size][] = $product_color;
					$_SESSION['shopping_cart_qty'][$productid][$product_size][$product_color] = $product_qty;
					$msg = 1;			
				}
				else
				{	
				    //print_r($_SESSION['shopping_cart_product'][$productid][$product_size]);
				    if(!empty($_SESSION['shopping_cart_product'][$productid][$product_size]))
				    {
    					if(in_array($product_color,$_SESSION['shopping_cart_product'][$productid][$product_size]))
    					{
    						$_SESSION['shopping_cart_qty'][$productid][$product_size][$product_color]=$_SESSION['shopping_cart_qty'][$productid][$product_size][$product_color]+ $product_qty;
    					}
    					else
    					{
    						$_SESSION['shopping_cart_qty'][$productid][$product_size][$product_color] = $product_qty;
    						$_SESSION['shopping_cart_size'][$productid][] = $product_size;
    						$_SESSION['shopping_cart_color'][$productid][$product_size][] = $product_color;
    					}
				    }
				    else
				    {
				        $_SESSION['shopping_cart_qty'][$productid][$product_size][$product_color] = $product_qty;
    					$_SESSION['shopping_cart_size'][$productid][] = $product_size;
    					$_SESSION['shopping_cart_color'][$productid][$product_size][] = $product_color;
				    }
					$msg=1;
					// 2 show alredy exists in shopping cart
					//if(strstr(strtolower($product_color), strtolower($_SESSION['shopping_cart_product'][$productid][$product_size]))!== false)
					
				}
			}
			else{
				
				$_SESSION['shopping_cart_product'][] = $productid;
				$_SESSION['shopping_cart_price'][] = $args_product['cost_price'];
				$_SESSION['shopping_cart_qty'][$productid][$product_size][$product_color] = $product_qty;
				$_SESSION['shopping_cart_size'][$productid][] = $product_size;
				$_SESSION['shopping_cart_color'][$productid][$product_size][] = $product_color;
				$msg = 1;
			}
		}
	}
	else
		$msg = 3;
	
		//echo "<pre>";print_r($_SESSION);
	echo $msg;
}
?>
