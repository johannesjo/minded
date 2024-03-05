import logo from "@assets/img/logo.svg";

const Popup = () => {
  return (
    <div >
      <header >
        <img src={logo}  alt="logo" />
        <p class="font-bold">
          asdAAEdit <code>src/pages/popup/Popup.tsx</code> and save to reload.
        </p>
        <a

          href="https://github.com/solidjs/solid"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Solid
        </a>
      </header>
    </div>
  );
};

export default Popup;
