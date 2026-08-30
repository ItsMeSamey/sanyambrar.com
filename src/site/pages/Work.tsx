import { contributions,projects } from '../data.ts';
import { CompactList,ProjectCards } from '../components/Entries.tsx';
import { Intro,Section } from '../components/SiteChrome.tsx';
import { TopBar } from '../../shared/components/TopBar.tsx';
export function Work(){return <><TopBar/><main><Intro/><Section id="projects-title" title="Projects and demos"><ProjectCards entries={projects}/></Section><Section id="contributions-title" title="Contributions"><CompactList entries={contributions}/></Section></main></>}
