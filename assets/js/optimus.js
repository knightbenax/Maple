var el = {};
var processor = "";
var sk_key = ""; //sk_test_94d298828acb46be314425078b1e82d54b63adca
var api_root = "https://api.paystack.co/";
var gravatar_root = "https://www.gravatar.com/";
var transaction_objects = [];
var last_transaction_date = "";
const date_difference = 5;

const SECTION_MARGIN_TOP = 47;

$('body').on('click', '#open_dashboard', (event) => {
  event.preventDefault();
  let link = event.target.href;
  require("electron").shell.openExternal(link);
});

const ipcRenderer = require('electron').ipcRenderer;
const storage = require('electron-json-storage');
const md5 = require('md5');

ipcRenderer.on('app-online', (event, arg)=> {
  //secondWindow.show()
  //console.log('App is online!');
  $(".offline").css("display", "none");
  $(".maple-control-bar").css("top", "0px");
  $(".maple-header").css("top", "0px");
  $(".maple-transaction-holder").css("margin-top", SECTION_MARGIN_TOP + "px");
  $(".maple-single-transaction-holder").css("margin-top", SECTION_MARGIN_TOP + "px");
  $(".maple-settings-holder").css("margin-top", SECTION_MARGIN_TOP + "px");
  $(".maple-walkthrough").css("margin-top", SECTION_MARGIN_TOP + "px");
})


ipcRenderer.on('app-offline', (event, arg)=> {
  //secondWindow.show()
  //console.log('App is offline!');
  $(".offline").css("display", "block");
  const new_height = $(".offline").outerHeight(true);
  const new_margin_top = new_height + SECTION_MARGIN_TOP;
  $(".maple-control-bar").css("top", new_height + "px");
  $(".maple-header").css("top", new_height + "px");
  $(".maple-transaction-holder").css("margin-top", new_margin_top + "px");
  $(".maple-single-transaction-holder").css("margin-top", new_margin_top + "px");
  $(".maple-settings-holder").css("margin-top", new_margin_top + "px");
  $(".maple-walkthrough").css("margin-top", new_margin_top + "px");
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
    $(".maple-settings").css("display", "none");
    app_state = SETUP;

  } else {
    sk_key = data.secret_key;
    $(".maple-transactions").css("display", "block");
    $(".maple-setup").css("display", "none");
    $(".maple-settings").css("display", "none");
    $(".maple-settings #paystack-key").val(sk_key);
    app_state = TRANSACTIONS;

    //console.table(data);
    //console.log('http://ephod.io/maple/' + data.public_key);

    fetchData();
    setChartData(api_root, sk_key);
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

  //console.log("Listen for new data");

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

      $(".maple-graph").after(new_notifier);
      parseDataToView(result, true, true);
      $(".maple-empty").css("display", "none");
    }
  } catch(e){
    console.log(e);
  }


  await wait(30000);
  listenForData();
}

async function getSingleTransactionData(dataId){
  $.ajaxSetup({
     headers:{
        'Authorization': "Bearer " + sk_key
     }
  });

  try{
    let result = await fetchSingleTransaction(dataId);

    //let single_transaction = result.data.splice(-1, 1);
    if(!jQuery.isEmptyObject(result.data)){
      console.log(result);
      let element = result.data;

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
      if (days > date_difference){
        final_date = moment(transaction_date).format('ddd Do MMM YYYY, h:mm a');
      } else {
        final_date = date;
      }

      var device = "<i class='fa fa-fw fa-desktop'></i>";
      if (element.log !== null){
        switch (element.log.mobile) {
          case true:
            device = "<i class='fa fa-fw fa-mobile-alt'></i>";
            break;
          case false:
            device = "<i class='fa fa-fw fa-desktop'></i>";
            break;
          default:
            device = "<i class='fa fa-fw fa-mobile-alt'></i>";
        }
      }

      var customer_name = "";
      var customer_profile_image = "";
      if (element.customer.first_name == "" && element.customer.last_name == ""){
        //Let's get the name from Gravatar instead
        var email_hash = md5(element.customer.email);
        var email_result = await fetchGravatar(email_hash);
        console.log(email_result);
        if(typeof email_result.entry[0].name !== 'undefined'){
          customer_name = email_result.entry[0].name.formatted;
        } else {
          customer_name = email_result.entry[0].displayName;
        }
        customer_profile_image = "<div class='maple-single-transaction-customer-img' style='background-image:url(" + email_result.entry[0].thumbnailUrl + ")'></div>";
      } else {
        customer_name = element.customer.first_name + " " + element.customer.last_name;
      }

      //console.log(md5(element.customer.email));

      var amount = accounting.formatMoney(element.amount / 100, {symbol: currency, format: "%s%v"});
      let transaction = "<div class='maple-single-transaction'>\
      <div class='maple-single-transaction-section'>\
      <div class='maple-single-transaction-section-amount'><span>" + amount + "</span><span>" + device + "</span></div>\
      <div class='maple-single-transaction-section-content'>" + final_date + "</div>\
      <div class='maple-single-transaction-section-content'><span class='maple-tag " + status_css + "'>" + status + "</span></div>\
      </div>\
      <div class='maple-single-transaction-section maple-single-transaction-section--flex'>\
      " + customer_profile_image + "\
      <div>\
      <div class='maple-single-transaction-section-content'>" + customer_name + "</div>\
      <div class='maple-single-transaction-section-content'>" + element.customer.email +  "</div>\
      </div>\
      </div>\
      </div>";

      var timeline = "<div class='maple-single-transaction-timeline'>\
      <span class='maple-single-transaction-timeline-header'>Transaction Timeline</span>";
      //</div>";

      if (element.log !== null){
        if (!jQuery.isEmptyObject(element.log.history)){
          //var all_timelines_holder = "";
          var time_difference = 0;
          element.log.history.forEach(function(history){
            var timeline_date = element.log.start_time;// + time_difference;
            var time_date = moment.unix(timeline_date).add(time_difference, 'seconds').format('hh:mm:ss a');
            time_difference = history.time;
  
  
            var timeline_type = "";
            var salutation = "Customer";
  
            if (customer_name != ""){
              var split_name = customer_name.split(" ");
              if (split_name[0]){
                salutation = split_name[0];
              }
            }
  
            switch (history.type) {
              case "open":
                timeline_type = salutation + " " +  history.message.toLowerCase();
                break;
              case "action":
                timeline_type = salutation + " " + history.message.toLowerCase();
                break;
              case "error":
                timeline_type = salutation + " got " + history.message.toLowerCase();
                break;
              default:
                timeline_type = salutation + " " + history.message.toLowerCase();
                break;
            }
  
            var single_timeline = "<div class='maple-single-timeline'>\
            <div class='maple-single-timeline-edge'>\
            <span></span>\
            </div>\
            <div class='maple-single-timeline-content'>" + timeline_type +  "<br/>" + time_date  + "</div>\
            </div>";
  
            timeline = timeline + single_timeline;
          });
  
          timeline = timeline + "</div>";
  
          transaction = transaction + timeline;
        }
      }

      $(".maple-loader").css("display", "none");
      $(".maple-single-transaction-holder").append(transaction);
    }
  } catch (e) {
    console.log(e);
  }
}

function fetchNewTranasactions(current_time_date, last_transaction_date){
  //for some reasons, I thought it was supposed to be from now till a time in the past.
  //apparently, it's from a time in the past till now
  return $.get(api_root + "transaction?from=" + last_transaction_date + "&to=" + current_time_date, function (data) {});
}

function fetchSingleTransaction(transaction_id){
  return $.get(api_root + "transaction/" + transaction_id, function (data) {});
}

function fetchGravatar(email_hash){
  let url = gravatar_root + email_hash + ".json";
  console.log(url);
  return $.get(url, function (data) {});
}

function parseDataToView(data, new_or_old_event, prepend){
  //console.log(last_transaction_date);
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
    var transaction_id = element.id;
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
    if (days > date_difference){
      final_date = moment(transaction_date).format('ddd Do MMM YYYY, h:mm a');
    } else {
      final_date = date;
    }

    var amount = accounting.formatMoney(element.amount / 100, {symbol: currency, format: "%s%v"});
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
    var transaction = "<div class='maple-transaction " + transaction_bg + "' data-id='" + transaction_id +  "'>\
    <div class='maple-transaction-first'>\
    <span class='maple-currency'>" + amount + "</span><span class='maple-customer'>" + cus_email + "</span><span class='maple-tag " + status_css + "'>" + status + "</span>\
    </div>\
    <div class='maple-transaction-second'>\
    <span class='maple-date'>" + final_date +  "</span>\
    <span class='maple-domain'>" + domain + "</span>\
    </div>\
    </div>";
    if (prepend){
      //$(".maple-transaction-holder").prepend(transaction);
      $(".maple-graph").after(transaction);
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

  //console.log("Fetch Data");
  $.get(api_root + "transaction", function (data) {
      //alert(data);

      //console.table(data);
      //hide loader
      $(".maple-loader").css("display", "none");

      if(!jQuery.isEmptyObject(data.data)){
        //console.log();
        last_transaction_date = data.data[0].created_at;
        parseDataToView(data, false, false);

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
      storage.set('setup', { secret_key: sk_key, start: true, license: ""}, function(error){
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

function showSettings(){
  //console.log("Settings");
  $(".maple-transactions").css("display", "none");
  $(".maple-setup").css("display", "none");
  $(".maple-settings").css("display", "block");
  app_state = SETTINGS;
}

function hideSettings(){
  //console.log("Settings");
  $(".maple-transactions").css("display", "block");
  $(".maple-setup").css("display", "none");
  $(".maple-settings").css("display", "none");
  app_state = TRANSACTIONS;
}

function hideLoader(){
  $(".maple-loader").css("display", "none");
}

function hideSingleTransaction(){
  //console.log("Settings");
  $(".maple-transaction-holder").css("display", "block");
  $(".maple-single-transaction-holder").css("display", "none");
  $(".maple-transactions .maple-control-bar .words").html("Transactions");
  $(".maple-single-transaction-holder").html("");
  app_state = TRANSACTIONS;
}

function showSingleTransaction(dataId){
  //console.log("Settings");
  app_state = SINGLE_TRANSACTION;
  $(".maple-transaction-holder").css("display", "none");
  $(".maple-single-transaction-holder").css("display", "block");
  $(".maple-loader").css("display", "block");
  $(".maple-transactions .maple-control-bar .words").html("<i id='maple-back' class='fas fa-angle-left'></i>&nbsp;&nbsp;&nbsp;Single Transaction");
  getSingleTransactionData(dataId);
}
