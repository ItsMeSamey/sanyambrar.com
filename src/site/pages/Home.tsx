import { games,posts,tools } from '../data.ts';
import { CompactList,GameCards } from '../components/Entries.tsx';
import { Intro,Section,SiteHeader } from '../components/SiteChrome.tsx';
export function Home(){return <><SiteHeader active="home"/><main><Intro/><Section id="games-title" title="Games"><GameCards entries={games}/></Section><Section id="tools-title" title="Tools"><CompactList entries={tools}/></Section><Section id="writing-title" title="Writing"><CompactList entries={posts}/></Section></main></>}
