/* @refresh reload */
import { render } from 'solid-js/web';
import { JSX } from 'solid-js';

const root = document.getElementById('root');

const Popup: () => JSX.Element = () => {
  return (
    <>
      <h1>HellASDXaas sdsasdo world!!!!</h1>
    </>
  );
};

render(() => <Popup />, root!);



