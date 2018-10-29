var el = {};
var processor = "";
var sk_key = ""; //sk_test_94d298828acb46be314425078b1e82d54b63adca
var api_root = "https://api.paystack.co/";
var transaction_objects = [];
var last_transaction_date = "";

const SECTION_MARGIN_TOP = 46;

$('body').on('click', '#open_dashboard', (event) => {
  event.preventDefault();
  let link = event.target.href;
  require("electron").shell.openExternal(link);
});

const ipcRenderer = require('electron').ipcRenderer;
const storage = require('electron-json-storage');

ipcRenderer.on('app-online', (event, arg)=> {
  //secondWindow.show()
  //console.log('App is online!');
  $(".offline").css("display", "none");
  $(".maple-control-bar").css("top", "0px");
  $(".maple-transaction-holder").css("margin-top", SECTION_MARGIN_TOP + "px");
})


ipcRenderer.on('app-offline', (event, arg)=> {
  //secondWindow.show()
  //console.log('App is offline!');
  $(".offline").css("display", "block");
  const new_height = $(".offline").outerHeight(true);
  const new_margin_top = new_height + SECTION_MARGIN_TOP;
  $(".maple-control-bar").css("top", new_height + "px");
  $(".maple-transaction-holder").css("margin-top", new_margin_top + "px");

})

ipcRenderer.on('win-show', (event, arg)=> {

})

ipcRenderer.on('win-hidden', (event, arg)=> {

})

/*storage.clear(function(error) {
  if (error) throw error;
});*/

storage.get('setup', function(error, data) {
  if (error) throw error;



  //console.log(data);
  if(jQuery.isEmptyObject(data)){
    //console.log("empty");
    //this user hasn't set up anything yet
    //$(".header").css("display", "none");
    $(".maple-transactions").css("display", "none");
    $(".maple-setup").css("display", "block");
    app_state = SETUP;

  } else {

    $(".maple-transactions").css("display", "block");
    $(".maple-setup").css("display", "none");
    app_state = TRANSACTIONS;

    //console.table(data);
    //console.log('http://ephod.io/maple/' + data.public_key);
    sk_key = data.secret_key;
    fetchData();
  }

});

function showDesktopNotification(title, message){
  let myNotification = new Notification(title, {
      body: message,
      icon: "../assets/images/smile.png"//path.join(__dirname, '../assets/images/smile.png')
    })

    myNotification.onclick = () => {
      console.log('Notification clicked')
    }
}

async function wait(ms){
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function listenForData(){
  //set the ajaxHeaders
  $.ajaxSetup({
     headers:{
        'Authorization': "Bearer " + sk_key
     }
  });

  console.log("Listen for new data");

  let now = new Date().toJSON();
 //console.log(now);
  try {
    let result = await fetchNewTranasactions(now, last_transaction_date);
    //console.table(result);
    //Because our listing takes the last date of the last set, it would always return this transactions
    //so we need to remove it because redundancy
    let new_transactions = result.data.splice(-1, 1);
    if(!jQuery.isEmptyObject(result.data)){
      last_transaction_date = result.data[0].created_at;
      //if the event is just one, show a single event. IF the event is more than one, check if the user has grouped notifications checked on
      //and just show them all as one. Or show them individually
      if (result.data.length == 1){
        const element = result.data[0];
        const status = element.status;
        var currency = "";
        switch(element.currency){
          case "NGN":
            currency = "₦";
            break;
          case "USD":
            currency = "$";
            break;
          case "GBP":
            currency = "£";
            break;
          case "EUR":
            currency = "€";
            break;
        }
        const cus_email = element.customer.email;
        const amount = currency + accounting.formatNumber(element.amount / 100);
        switch (status){
          case "success":
            showDesktopNotification("Just got paid!", cus_email + " just paid you " + amount + ". Too much money!");
            break;
          case "failure":
            showDesktopNotification("Failed payment", "Payment from " + cus_email + " of " + amount + " just failed");
            break;
          case "abandoned":
            showDesktopNotification("Abandoned payment", cus_email + " just abandoned a payment of " + amount);
            break;
        }

      } else {
        //check if group notifications is turned on.
        //group the notifications.
      }

      var new_notifier = "<div class='maple-new-event'>\
      <span class='maple-red-line'></span>\
      <span class='maple-new-event-text'>New transactions</span>\
      <span class='maple-red-line'></span></div>";

      $(".maple-transaction-holder").prepend(new_notifier);
      parseDataToView(result, true, true);
      $(".maple-empty").css("display", "none");
    }
  } catch(e){
    console.log(e);
  }



  await wait(30000);
  listenForData();
}

function fetchNewTranasactions(current_time_date, last_transaction_date){
  //for some reasons, I thought it was supposed to be from now till a time in the past.
  //apparently, it's from a time in the past till now
  return $.get(api_root + "transaction?from=" + last_transaction_date + "&to=" + current_time_date, function (data) {});
}

function parseDataToView(data, new_or_old_event, prepend){
  console.log(last_transaction_date);
  transaction_objects = data.data;
  transaction_objects.forEach(function(element){
    var currency = "";
    var transaction_date;
    switch(element.currency){
      case "NGN":
        currency = "₦";
        break;
      case "USD":
        currency = "$";
        break;
      case "GBP":
        currency = "£";
        break;
      case "EUR":
        currency = "€";
        break;
    }
    var status_css = "";
    var status = element.status;
    switch(element.status){
      case "success":
        status_css = "success";
        transaction_date = moment(element.paid_at);
        break;
      case "reversed":
        status_css = "reversed";
        transaction_date = moment(element.created_at);
        break;
      default:
        status_css = "failure";
        transaction_date = moment(element.created_at);
        break;
    }
    const date = moment(transaction_date).fromNow();
    const d_today = new Date();
    const todayMoment = moment(d_today);
    const days = todayMoment.diff(transaction_date, 'days');
    var final_date = "";
    if (days > 7){
      final_date = moment(transaction_date).format('ddd Do MMM YYYY, h:mm a');
    } else {
      final_date = date;
    }

    var amount = accounting.formatNumber(element.amount / 100);
    var cus_email = element.customer.email;
    var status = element.status;
    var domain = element.domain;

    let transaction_bg = "";

    if (new_or_old_event){
      transaction_bg = "new";
    } else {
      transaction_bg = "old";
    }

    //console.log(new_or_old_event);

    var transaction = "<div class='maple-transaction " + transaction_bg + "'>\
    <div class='maple-transaction-first'>\
    <span class='maple-currency'>" + currency + amount + "</span><span class='maple-customer'>" + cus_email + "</span><span class='maple-tag " + status_css + "'>" + status + "</span>\
    </div>\
    <div class='maple-transaction-second'>\
    <span class='maple-date'>" + final_date +  "</span>\
    <span class='maple-domain'>" + domain + "</span>\
    </div>\
    </div>";
    if (prepend){
      $(".maple-transaction-holder").prepend(transaction);
    } else {
      $(".maple-transaction-holder").append(transaction);
    }
});
}

function fetchData(){
  //set the ajaxHeaders
  $.ajaxSetup({
     headers:{
        'Authorization': "Bearer " + sk_key
     }
  });

  console.log("Fetch Data");
  $.get(api_root + "transaction", function (data) {
      //alert(data);

      //console.table(data);
      if(!jQuery.isEmptyObject(data.data)){
        //console.log();
        last_transaction_date = data.data[0].created_at;
        parseDataToView(data, false, false);
        //$(".maple-empty").css("display", "none");
        listenForData();
      } else {
          $(".maple-empty").css("display", "flex");
      }

  }, 'json');
}


/*$('.placeholder').on('click', function (ev) {
  //$('.placeholder').css('opacity', '0');
  //$('.list__ul').toggle();
  $(this).parent().find('.list__ul').toggle();
});

 $('.list__ul a').on('click', function (ev) {
   ev.preventDefault();
   var index = $(this).parent().index();

   //$('.placeholder').text( $(this).text() ).css('opacity', '1');

   //console.log($('.list__ul').find('li').eq(index).html());

   //$('.list__ul').find('li').eq(index).prependTo('.list__ul');
   //$('.list__ul').toggle();
   var text =  $(this).text();

   processor = text;

   $(this).parent().parent().parent().find('.placeholder').text(text).css('opacity', '1');

   //console.log($('.list__ul').find('li').eq(index).html());

   //console.log($(this).parent().parent().attr('class'));

   $(this).parent().parent().find('li').eq(index).prependTo($(this).parent().parent());
   $(this).parent().parent().toggle();

 });*/


$('select').on('change', function (e) {

  // Set text on placeholder hidden element
  $('#processor .placeholder').text(this.value);
  processor = this.value;
  $(".status").css("display", "none");

  // Animate select width as placeholder
  //$(this).animate({width: $('.placeholder').width() + 'px' });

});


function cycleScreens(){
    if ($("#key").val() == ""){
      //Show warning
    } else {

      sk_key = $("#key").val();
      storage.set('setup', { secret_key: sk_key}, function(error){
        if (error) throw error;

        $(".maple-setup").css("display", "none");
        $(".maple-transactions").css("display", "block");
        app_state = TRANSACTIONS;
        fetchData();
      });
    }

}

function backScreens(){
  if($(".third").css('display') == 'block'){

    $(".third").css("display", "none");
    $(".second").css("display", "block");

  } else if($(".second").css('display') == 'block'){
    $(".second .message").html("Your public key is how Maple <br/>identifies you to ");
    $(".second .label").text("Public Key");

    $(".second").css("display", "none");
    $(".first").css("display", "block");
    $("#back_btn").css('display', 'none');
  }
}
