<?php
//echo phpinfo();
//ini_set('session.save_path', ' /var/cpanel/php/sessions/ea-php74');
session_start();
error_reporting(E_ALL ^ E_NOTICE);
ob_start();


#this file have the global declaration of variables
define('Config_Path','config');
if($_SERVER['HTTP_HOST']=='localhost')
{
	define('Host','localhost');
	define('User','root');
	define('Password','');
	define('Database','sstarsap_apparelstars');
}
else
{
define("Host","localhost");
//define("User","sghmatrix");
//define("Password","h#uwXbRhzsii");
//define("Database","starbranding");
define("User","sstarsap_starsaaaaa");
define("Password","bTXlOFm8C-}{");
define("Database","sstarsap_apparelstars");
}
define('TITLE_USER','Welcome To Stars Apparel');
/*define('Currency','�');
define('CURRENCY','&pound;');*/
define('CURRENCY','$');
define('CURRENCYUSD','USD');
define('Image_Path','product_image');
define('TABLE_PREFIX','');
define('USERID',$_SESSION['DI_User_Id']);
define('USERNAME',$_SESSION['DI_User_Name']);
define('USERTYPE',$_SESSION['DI_User_Type']);
define('USERFIRSTNAME',$_SESSION['DI_User_FirstName']);

date_default_timezone_set('America/New_York');
include("DBConnection.php");
$db=new DBConnection();
$dbcon=$db->select_database(Host,User,Password,Database);
//print_r($db);
//print_r($_SESSION);
?>