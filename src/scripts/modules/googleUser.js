/****** Google SignIn ******/
function renderSignInButton(){
    gapi.signin2.render('my-signin2', {
        'scope': 'profile email https://www.googleapis.com/auth/devstorage.full_control https://www.googleapis.com/auth/plus.me',
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        'onsuccess': onSuccess,
        'onfailure': onFailure
    })
}

function onSuccess(googleUser){
    $('#g-signout').show();
    // RawDataQuery.callFireCloud(googleUser);
}

function signOut() {
    let auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function() {
        console.log('User signed out');
    });
    $('#g-signout').hide();
}

function onFailure(error){
    console.error(error)
}

function checkSignedIn(){
    if (gapi.auth2) {
        return getUser().isSignedIn();
    } else {
        return false;
    }
}

function getUser(){
    return gapi.auth2.getAuthInstance().currentUser.get()
}