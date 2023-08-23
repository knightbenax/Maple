$('body').on('click', '#maple-shut-down', (event) => {
  ipcRenderer.send('close-me');
});

$('body').on('click', '#maple-settings-btn', (event) => {
  showSettings();
});

$('body').on('click', '#maple-back', (event) => {
  hideLoader();
  switch (app_state) {
    case SETTINGS:
      hideSettings();
      break;
    case SINGLE_TRANSACTION:
      hideSingleTransaction();
      break;
  }
});

$('body').on('click', '.maple-transaction', function () {
  //console.log();
  var dataId = $(this).attr("data-id");
  showSingleTransaction(dataId);
});
