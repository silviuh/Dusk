const form = document.getElementById('update-form');
form.addEventListener('submit', sendData);

console.log("am aj aiic");

async function sendData(data) {
    const XHR = new XMLHttpRequest();
    xhttp.open("POST", "/update-profile", true);
    xhttp.setRequestHeader("Content-type", "application/json");

    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var result = this.response.JSON;
            if (result.status === 'ok') {
                // everythign went fine
                alert('Success')
            } else {
                alert(result.error)
            }
            /*
            if (response === "ok") {
                                                                alert("User information updated");
            }
            else if (response === "error") {
                                                                alert("there was an error in sending the data to the server.");
            }
            */
        }
    };

    var data = {
        firstname: document.getElementById('firstname').value,
        lastname: document.getElementById('lastname').value,
        password: document.getElementById('password').value
    };

    xhttp.send(JSON.stringify(data));
}
