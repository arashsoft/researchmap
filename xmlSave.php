<?php
    $myFile = $_POST['name'];
    $fh = fopen($myFile, 'w') or die("can't open file");
    fwrite($fh,var_export($_POST['data'], true));
    fclose($fh);
?>
