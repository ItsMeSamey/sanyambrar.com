import './styles/site.css';
import './styles/game-settings.css';
import './theme.ts';
import './site.ts';
import './topbar.ts';

document.documentElement.toggleAttribute('data-samey-runtime-ready', true);
dispatchEvent(new Event('samey-runtime-ready'));
