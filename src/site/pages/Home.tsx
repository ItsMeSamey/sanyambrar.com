import { games,posts,tools } from '../data.ts';
import { CompactList,GameCards } from '../components/Entries.tsx';
import { Intro,Section } from '../components/SiteChrome.tsx';
import { TopBar } from '../../shared/components/TopBar.tsx';
export function Home(){return <><TopBar showWork/><main><Intro/><Section id="games-title" title="Games"><GameCards entries={games}/></Section><Section id="tools-title" title="Tools"><CompactList entries={tools}/></Section><Section id="writing-title" title="Writing"><CompactList entries={posts}/></Section></main></>}
