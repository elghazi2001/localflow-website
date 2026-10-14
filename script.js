/* script.js */

const mobileMenuButton =
  document.getElementById("mobileMenuButton");

const mobileMenu =
  document.getElementById("mobileMenu");


/* MOBILE MENU */

mobileMenuButton.addEventListener(
  "click",
  () => {
    mobileMenu.classList.toggle("open");
  }
);


document
  .querySelectorAll(".mobile-menu a")
  .forEach(link => {
    link.addEventListener(
      "click",
      () => {
        mobileMenu.classList.remove("open");
      }
    );
  });


/* CONTACT FORM */

const contactForm =
  document.getElementById("contactForm");

const formSuccess =
  document.getElementById("formSuccess");


contactForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const data =
      new FormData(contactForm);

    const enquiry = {
      name:
        data.get("name"),

      business:
        data.get("business"),

      email:
        data.get("email"),

      service:
        data.get("service"),

      message:
        data.get("message"),

      createdAt:
        new Date().toISOString()
    };


    try {

      const response = await fetch(
        "43b00348f08bf949ba6b5cb76f063202",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          body: JSON.stringify({
            name: enquiry.name,

            business:
              enquiry.business,

            email:
              enquiry.email,

            service:
              enquiry.service,

            message:
              enquiry.message,

            createdAt:
              enquiry.createdAt,

            _subject:
              "New LocalFlow enquiry",

            _captcha:
              "false"
          })
        }
      );


      if (!response.ok) {
        throw new Error(
          "Failed to send message"
        );
      }


      formSuccess.textContent =
        "✓ Thanks. Your message has been sent successfully.";

      formSuccess.style.display =
        "block";

      contactForm.reset();


      setTimeout(() => {

        formSuccess.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      }, 100);


    } catch (error) {

      console.error(
        "Email error:",
        error
      );

      formSuccess.textContent =
        "Something went wrong. Please try again or email us directly.";

      formSuccess.style.display =
        "block";

    }

  }
);


/* SCROLL REVEAL */

const revealElements =
  document.querySelectorAll(
    ".project, .service-card, .process-card, .review-card"
  );


const revealObserver =
  new IntersectionObserver(
    entries => {

      entries.forEach(entry => {

        if (
          entry.isIntersecting
        ) {

          entry.target.classList.add(
            "visible"
          );

          revealObserver.unobserve(
            entry.target
          );

        }

      });

    },
    {
      threshold: 0.12
    }
  );


revealElements.forEach(
  element => {

    element.classList.add(
      "reveal"
    );

    revealObserver.observe(
      element
    );

  }
);


/* EXTRA REVEAL CSS */

const revealStyle =
  document.createElement("style");

revealStyle.textContent = `

  .reveal {
    opacity: 0;
    transform: translateY(25px);

    transition:
      opacity .7s ease,
      transform .7s cubic-bezier(.2,.7,.2,1);
  }

  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }

`;

document.head.appendChild(
  revealStyle
);


/* HEADER SHADOW ON SCROLL */

const navbar =
  document.querySelector(".navbar");


window.addEventListener(
  "scroll",
  () => {

    if (window.scrollY > 20) {

      navbar.style.boxShadow =
        "0 10px 30px rgba(40,40,30,.06)";

    } else {

      navbar.style.boxShadow =
        "none";

    }

  }
);
