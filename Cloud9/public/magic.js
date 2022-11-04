$(document).ready(function(){
    $("form#changeQuote").on('submit', function(e){
        e.preventDefault();
        // var data = $('input[name=quote]').val();
        let value=$("#value-name").val();
        // while (true){
            $.ajax({
                url: '/ajax',
                method: 'POST',
                dataType: "text",
                data: quote.value,
                success: function(res){
                    $("h1").html(`Quote: ${res.response}`);
                }
            })
        // }
        
    })
})