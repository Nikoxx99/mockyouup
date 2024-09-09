<?php
class DBConnection
{
	var $rs;
	var $dbh;
	
	public function __construct()
	{
		$this->rs = "";
		$this->dbh = "";
		$this->dbh=mysqli_connect(Host,User,Password,Database) or die("Database Connection Unsuccessfull");
		$dbh=$this->dbh;
	}
	function connection($host,$user,$password='',$database)
	{
		//echo $host.",".$user.",".$password; echo "<br>";
		//$this->dbh=mysql_connect($host,$user,$password) or die("Database Connection Unsuccessfull");
		/*$this->dbh=mysqli_connect($host,$user,$password,$database) or die("Database Connection Unsuccessfull");*/
		if($this->dbh)
		{
			return $dbh=$this->dbh;
			//echo "Database Connection Successfull"; exit;
		}
		else
		{
			echo "Database Connection Unsuccessfull"; exit;
		}
	}
	function select_database($host,$user,$password='',$database)
	{
		//echo $host.",".$user.",".$password."###".$database;exit;
		if($this->dbh=$this->connection($host,$user,$password,$database))
		{
			//$res=mysql_select_db($database);
			//var_dump($res);
			return $dbh=$this->dbh;
		}
		else
		{
		echo "Database Selection Unsuccessfull"; exit;
		}
	}

	// Function to get the client IP address
	function get_client_ip() {
	    $ipaddress = '';
	    if (getenv('HTTP_CLIENT_IP'))
	        $ipaddress = getenv('HTTP_CLIENT_IP');
	    else if(getenv('HTTP_X_FORWARDED_FOR'))
	        $ipaddress = getenv('HTTP_X_FORWARDED_FOR');
	    else if(getenv('HTTP_X_FORWARDED'))
	        $ipaddress = getenv('HTTP_X_FORWARDED');
	    else if(getenv('HTTP_FORWARDED_FOR'))
	        $ipaddress = getenv('HTTP_FORWARDED_FOR');
	    else if(getenv('HTTP_FORWARDED'))
	       $ipaddress = getenv('HTTP_FORWARDED');
	    else if(getenv('REMOTE_ADDR'))
	        $ipaddress = getenv('REMOTE_ADDR');
	    else
	        $ipaddress = 'UNKNOWN';
	    return $ipaddress;
	}

	// base delete query 
	public function delete( $table, $where = array(), $limit = '' )
    {
        global $dbh;
        //Delete clauses require a where param, otherwise use "truncate"
        if( empty( $where ) )
        {
            return false;
        }
        
        $sql = "DELETE FROM ". $table;
        foreach( $where as $field => $value )
        {
            $value = $value;
            $clause[] = "$field = '$value'";
        }
        $sql .= " WHERE ". implode(' AND ', $clause);
        
        if( !empty( $limit ) )
        {
            $sql .= " LIMIT ". $limit;
        }
            
        if(mysqli_query($this->dbh, $sql ))
		{
			return true;
		}
		else
		{
			return false;
		}
    }

     public function escape( $data )
     {
         if( !is_array( $data ) )
         {
             $data = $this->dbh->mysqli_real_escape_string($data );
         }
         else
         {
             //Self call function to sanitize array data
             $data = array_map( array( $this, 'escape' ), $data );
         }
         return $data;
     }
    

	//base update query 
	
	 public function update( $table, $variables = array(), $where = array() )
    {
        global $dbh;
        //self::$counter++;
        //Make sure the required data is passed before continuing
        //This does not include the $where variable as (though infrequently)
        //queries are designated to update entire tables
        if( empty( $variables ) )
        {
            return false;
        }
        $sql = "UPDATE ". $table ." SET ";
        foreach( $variables as $field => $value )
        {
            
            $updates[] = "`$field` = '$value'";
        }
        $sql .= implode(', ', $updates);
        
        //Add the $where clauses as needed
        if( !empty( $where ) )
        {
            foreach( $where as $field => $value )
            {
                $value = $value;

                $clause[] = "$field = '$value'";
            }
            $sql .= ' WHERE '. implode(' AND ', $clause);   
            
	   }
        //echo $sql;die;
       if(mysqli_query( $this->dbh,$sql))
		{
			return true;
		}
		else
		{
			return false;
		}

    }
	// inser query 
	public function insert( $table, $variables = array() )
    {
        global $dbh;
        //self::$counter++;
        //Make sure the array isn't empty
        if( empty( $variables ) )
        {
            return false;
        }
        
        $sql = "INSERT INTO ". $table;
        $fields = array();
        $values = array();
        foreach( $variables as $field => $value )
        {
            if($value==''){$value=0;}
            $fields[] = $field;
            $values[] = "'".$value."'";
        }
        $fields = ' (' . implode(', ', $fields) . ')';
        $values = '('. implode(', ', $values) .')';
        
        $sql .= $fields .' VALUES '. $values;
        $query = mysqli_query($this->dbh, $sql) or die("has".mysqli_error($this->dbh));
        if($query)
        {
            return true;
        }
        else
        {
            return false;
        }
		
    }

	function query($slt, $table, $where=false)
	{
	    global $dbh;
		//echo "select ".$slt." from ".$table." where ".$where;
		return mysqli_query($this->dbh,"select ".$slt." from ".$table." where ".$where);
	}
	function query_execute($sql)
	{
	    global $dbh;
		return mysqli_query($this->dbh,$sql);
	}
	function execute_query($slt, $table, $where=false, $order_by)
	{
	    global $dbh;
		//echo "select ".$slt." from ".$table." where ".$where." order by ".$order_by;
		return mysqli_query($this->dbh,"select ".$slt." from ".$table." where ".$where." order by ".$order_by );
	}
	function execute_join_query($select, $table1,$table2,$on, $where=false, $order_by)
	{
	    global $dbh;
		 $sql="select ".$select." from ".$table1." inner join ".$table2." on ".$on." where ".$where." order by ".$order_by;
	
		return mysqli_query($this->dbh,$sql);
	}
	function result($res, $p1, $p2)
	{
		return mysqli_result($res, $p1, $p2);
	}
	function num_row($res)
	{
		return mysqli_num_rows($res);
	}
	function get_row($res)
	{
		$row=mysqli_fetch_array($res);
		return $row[0];
	}
	function get_all_row($res)
	{
		$row=mysqli_fetch_assoc($res);
		return $row;
	}
}
?>