document.addEventListener("DOMContentLoaded", function () {

     // Existing menu toggle code
     const menuToggle = document.querySelector('.menu-toggle');
     const nav = document.querySelector('.nav');
     const dropdowns = document.querySelectorAll('.dropdown');
 
     // Toggle the mobile menu
     menuToggle.addEventListener('click', function() {
         nav.classList.toggle('active');
         this.classList.toggle('active'); // Toggle 'active' class on menu-toggle
     });
 
     // Handle dropdown menu toggling
     dropdowns.forEach(dropdown => {
         dropdown.addEventListener('click', function(event) {
             event.stopPropagation();
             this.querySelector('.dropdown-content').classList.toggle('active');
         });
     });
 
     // Handle window resizing
     window.addEventListener('resize', function() {
         if (window.innerWidth > 900) {
             nav.classList.remove('active');
             menuToggle.classList.remove('active');
         }
     });
 
     // Resource titles toggle
     const resourceTitles = document.querySelectorAll('.resource-title');
     resourceTitles.forEach(title => {
         title.addEventListener('click', function() {
             const content = this.nextElementSibling;
             // Toggle the display of the content
             if (content.style.display === "block") {
                 content.style.display = "none";
             } else {
                 content.style.display = "block";
             }
         });
     });
    // Toggle login and registration forms
    document.getElementById("showLogin").addEventListener("click", function () {
        document.getElementById("registrationForm").style.display = "none";
        document.getElementById("loginForm").style.display = "block";
    });

    document.getElementById("showRegister").addEventListener("click", function () {
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("registrationForm").style.display = "block";
    });

    // Toggle password visibility for login form
    const toggleLoginPassword = document.querySelector("#togglePassword");
    const loginPassword = document.querySelector("#loginPassword");

    toggleLoginPassword.addEventListener("click", function () {
        const type = loginPassword.getAttribute("type") === "password" ? "text" : "password";
        loginPassword.setAttribute("type", type);
        this.classList.toggle("fa-eye-slash");
    });

    // Toggle password visibility for registration form password field
    const toggleRegisterPassword = document.querySelectorAll(".input-container i");

    toggleRegisterPassword.forEach(toggleIcon => {
        toggleIcon.addEventListener("click", function () {
            const passwordField = this.previousElementSibling; // Gets the input field before the eye icon
            const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
            passwordField.setAttribute("type", type);
            this.classList.toggle("fa-eye-slash");
        });
    });

    // Login form validation
    document.getElementById("loginForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        if (!validateEmail(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (password === "") {
            alert("Please enter your password.");
            return;
        } else if (password.length < 8) {
            alert("Password must be at least 8 characters long.");
            return;
        }

        alert("Login successful!");
    });

    // Email validation function
    function validateEmail(email) {
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailPattern.test(email);
    }
    function showForm(form) {
        document.getElementById('signin').style.display = (form === 'signin') ? 'block' : 'none';
        document.getElementById('signup').style.display = (form === 'signup') ? 'block' : 'none';
      }
});
