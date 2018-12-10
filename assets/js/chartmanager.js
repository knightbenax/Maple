var labels = new Array();
var data_value = new Array();
var paid_percent;
var currency;
var net_revenue = 0;


function fetchChartData(route, sk_key){
  $.ajaxSetup({
     headers:{
        'Authorization': "Bearer " + sk_key
     }
  });


  var current_time_date = new Date().toJSON();
  var temp_date = (new Date()).getDate() - 7;
  var last_transaction_date = new Date();
  last_transaction_date.setDate(temp_date);

  last_transaction_date = last_transaction_date.toJSON();
  //console.log(last_transaction_date);
  var api_route = route + "transaction?from=" + last_transaction_date + "&to=" + current_time_date;
  return $.get(api_route, function (data) {});
}


async function setChartData(route, sk_key){
  try{
    let result = await fetchChartData(route, sk_key);

    //console.log(result);
    if (result.data.length > 0){
      var transaction_objects = result.data;
      var previousDate;
      transaction_objects.forEach(function(element){

        var status = element.status;
        if (status == "success"){
          net_revenue = net_revenue + (element.amount / 100);
          data_value.push(element.amount / 100);
          let this_date = moment(element.paid_at).format('MMM DD');
          labels.push(this_date);
        }
      });

      //we want to group the arrays by the dates
      //so that all amounts are added per day
      groupArrays();
      /**
      ** Setting values of tomorrow today. We seeing into the future bitch
      **/
      checkArrays();
      labels.push("");
      data_value.push("0");

    } else {
      var current_time_date = new Date();
      for(var i = 0; i <= 8; i++){
        var amount = Math.floor((Math.random() * 6));
        net_revenue = net_revenue + amount;
        var this_date = current_time_date.getDate() - (7 - i);
        var element_date = new Date();
        element_date.setDate(this_date);
        labels.push(moment(element_date).format('MMM DD'));
        data_value.push(amount);
        //data_value.push("4");
      }
    }

    setNetRevenue();
    drawChart();

  } catch (e){
    console.log(e);
  }
}


function groupArrays(){
  var tempLabel = new Array();
  var tempData = new Array();
  var total_amount = 0;
  for (var i = 0; i < labels.length; i++){
    var next = i + 1;
    //means this index is still part of the array
    if (next < labels.length){
      if (labels[i] == labels[next]){
        total_amount = total_amount + data_value[i] + data_value[next];
        tempData.push(total_amount);
        tempLabel.push(labels[i]);
      } else {
        total_amount = 0;
        tempLabel.push(labels[i]);
      }
    }
  }

  //console.log(tempLabel);
  //console.log(tempData);
  labels = tempLabel;
  data_value = tempData;
}

function checkArrays(){
  /**
  * We are getting from eight days the number of days required to
  * fill the rest of the dates with empty data.
  **/
  var nine_days_ago = (new Date()).getDate();
  var temp_days = new Array();

  for(var i = 8; i >= 0; i--){

    var days_ago = (new Date()).getDate() - i;
    var this_date = new Date();
    this_date.setDate(days_ago);

    let this_temp_date = moment(this_date).format('MMM DD');
    temp_days.push(this_temp_date);

  }

  var finalLabels = new Array();
  var finalData = new Array();
  temp_days.forEach(function(temp_day){
    var indexOf = labels.indexOf(temp_day);
    if (indexOf == -1){ //means this is an empty spot, fill it
      finalLabels.push(temp_day);
      finalData.push(0);
    } else {
      finalLabels.push(temp_day);
      finalData.push(data_value[indexOf]);
    }
  });

  //console.log(finalLabels);
  //console.log(finalData);
  labels = finalLabels;
  data_value = finalData;

}

function setNetRevenue(){
  currency = "₦";
  net_revenue = accounting.formatMoney(net_revenue, {symbol: currency, format: "%s%v"});
  $(".maple-revenue").html("<span class='maple-revenue-figure'>" + net_revenue + "</span><span class='maple-revenue-figure-text'>Revenue - Past week</span>");
}

function getNumberLength(number){
  return number.toString().length;
}

function getMax(){
  let max = Math.floor(Math.max.apply(null, data_value));
  //console.log(max);
  var length = (getNumberLength(max) + 1);
  var length_pow = Math.pow(10, length);
  //console.log("Power " + length_pow);
  //console.log("Length " + length);
  //console.log("Max " + max);
  return max + (length_pow);
}

function drawChart(){
  //console.log("Rice");
  var ctx = document.getElementById("myChart").getContext('2d');
  var myChart = new Chart(ctx, {
      type: 'line',
      data: {
          labels: labels,
          datasets: [{
              data: data_value,
              backgroundColor: 'rgba(96, 61, 199, 0.2)',
              borderColor: 'rgba(96, 61, 199,1)',
              borderWidth: 4
              //fill: false,
          }]
      },
      options: {
          tooltips: {
            enabled: true,
            mode: 'single',
            bodyFontFamily: 'Cera Pro',
            callbacks: {
              title: function(tooltipItems, data) {
                var tooltipItem = tooltipItems[0];
                //console.log(data.labels[tooltipItem.index]);
                return data.labels[tooltipItem.index];
              },
              label: function(tooltipItem, data) {
                var value = data.datasets[0].data[tooltipItem.index];
                if (value){
                  return (formatCur(value));
                } else {
                  return '₦0.00';
                }
              }
            }
          },
          legend: {
              display: false,
              position: 'bottom',
              labels: {
                  // This more specific font property overrides the global property
                  fontColor: 'black',
                  defaultFontSize: 8,
                  defaultFontFamily: 'Cera Pro'
              }
          },
          responsive: false,
          maintainAspectRatio: true,
          elements: {
            line: {
              tension: 0.00001
            }
          },
          scales: {
              xAxes: [{
                position: 'bottom',
                display: true,
                 gridLines: {
                    display:false,
                    drawBorder: false,
                    tickMarkLength: 1
                 },
                 ticks: {
                    display: true,
                    fontColor: '#000',
                    fontFamily: 'Cera Pro',
                    fontSize: 10,
                    autoSkip: false,
                    maxRotation: 0,
                    minRotation: 0,
                    padding: 10,
                    /**This callback is to remove the labels from both ends of the graph**/
                    callback: function(value, index, values) {
                       if (index == 0 || index == 8){
                         return '';
                       } else if (index == 6) {
                         return 'Yesterday';
                       } else if (index == 7) {
                         return 'Today';
                       } else {
                         return value;
                       }
                    }
                    /*beginAtZero:true*/
                 }
             }],
              yAxes: [{
                  display: false,
                  gridLines: {
                      /*drawBorder: false,
                      display:false*/
                      tickMarkLength: 1
                  },
                  ticks: {
                      display: false,
                      beginAtZero:true,
                      max: getMax()
                  }
              }]
          }
      }
  });
}

function formatCur(amount){
  currency = "₦";
  s = accounting.formatMoney(amount, {symbol: currency, format: "%s%v"});
  return s;
}
