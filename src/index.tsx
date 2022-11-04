import {StrictMode} from "react";
import * as ReactDOMClient from "react-dom/client";

import App from "./App";

function mount() {
    const container = document.getElementById('root');
    if (container) {
        const root = ReactDOMClient.createRoot(container);
        return root.render(
            <StrictMode>
                <App />
            </StrictMode>
        );
    }
}

mount()