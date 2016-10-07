function addPollOption (option) {
    var html = $(
        '<div id="poll-option">' +
            '<div class="input-group">' +
                '<input type="text" name="option" autocomplete="off" class="form-control" disabled placeholder="' + option + '">' +
                '<span class="input-group-btn">' +
                    '<button class="btn btn-default remove-option" type="button">' +
                        '<i class="glyphicon glyphicon-remove-circle"></i>' +
                    '</button>' +
                '</span>' +
            '</div>' +
        '</div>');
    
    $('#options-list').append(html);

    var button = $(html).find('.remove-option');
    button.click(removePollOption)
}

function removePollOption () {
    var div = $(this).parents('#poll-option');
    div.remove();
}

$(document).ready(function () {

    $('#poll-submit').click(function (e) {
        e.preventDefault();

        var optionsInputs = $('#options-list input');
        var options = [];

        for (var i=0; i < optionsInputs.length; i++) {
            options.push(optionsInputs[i].val());
        }

        $.ajax({
            type: 'POST',
            url: '/new',
            data: options
        });
    });

    $('#add-option').click(function () {
        var div = $(this).parents('#add-option-group');
        var input = div.find('input');

        addPollOption(input.val());
        input.val('');
    });
    
});