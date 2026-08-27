import { contributions,moreProjects,projects } from '../data.ts';
import { CompactList,ProjectCards } from '../components/Entries.tsx';
import { Intro,Section } from '../components/SiteChrome.tsx';
import { TopBar } from '../../shared/components/TopBar.tsx';
export function Work(){return <><TopBar showWork activeHref="/work"/><main><Intro/><Section id="projects-title" title="Selected projects"><ProjectCards entries={projects}/></Section><Section id="more-title" title="More"><CompactList entries={moreProjects}/></Section><Section id="contributions-title" title="Contributions"><CompactList entries={contributions}/></Section></main></>}
