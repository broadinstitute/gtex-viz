function getrandom(num , mul)
{
   var value = [ ]	;
    for(i=0;i<=num;i++)
   {
     rand = Math.random() * mul;
      value.push(rand);
   }
    return value;
}