import React, {useEffect, useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import packageJson from "../package.json";
import {
  Home, Search, Library, ListMusic, BarChart3, Heart, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Crown, Shuffle, Repeat2, Clock3,
  Disc3, Users, ChevronRight, ArrowLeft, Sparkles, Zap, Radio, Headphones, Mic2, Music2,
  Settings, Download, Plus, ListPlus, Pencil, ListOrdered, Timer, SlidersHorizontal, X, GripVertical, BadgeCheck,
  Sun, Moon, RotateCcw, MoreHorizontal, UsersRound, Share2, Layers3, UserRound, Mail, LockKeyhole, LogOut, Link2, Upload, ShieldCheck, ShieldAlert, CheckCircle2, Trash2
} from "lucide-react";
import "./styles.css";
import { matchSpotifyTrackToCatalog, normalizeSpotifyMatchText } from "./spotifyImport.js";
import { calculateTasteProfile, canDownloadFromOrigin, isAppOnline, normalizePlaylistName, resolveAssetUrl } from "./appLogic.js";
import { getLocalDateKey, getStreakMilestoneInfo, normalizeStreakState, updateStreakForListen } from "./streakLogic.js";

let queueSongAction=()=>{};

const getSongUrl = (song) => song?.url || song?.file || "";
const hasSongAudio = (song) => Boolean(getSongUrl(song));
const genreFamily = genre => {
  const value=String(genre||"").toLowerCase();
  if(value.includes("rap")||value.includes("hip hop")) return "rap";
  if(value.includes("pop")) return "pop";
  if(value.includes("electronic")||value.includes("dance")) return "electronic";
  return value;
};
const isRelatedGenre = (source,candidate) => !source || genreFamily(source)===genreFamily(candidate);

const ALBUMS = [
  {
    id:"formula-oneda",
    title:"Formula OneDa",
    artist:"OneDa",
    year:2024,
    genre:"UK Rap",
    artwork:"/images/formula-oneda.png",
    artistImage:"/images/artist-oneda.png",
    trackIds:["let-me-in-oneda","major-pay-oneda-renee-stormz","the-formula-oneda","raised-oneda","over-my-dead-body-oneda","pull-up-oneda","sometimes-oneda","the-plug-oneda","leader-oneda","the-western-way-oneda","superwoman-oneda","set-it-off-oneda"],
    custom:true,
    type:"album"
  },
  {
    id:"wildchild-alex-warren",
    title:"WILDCHILD",
    artist:"Alex Warren",
    year:2026,
    genre:"Pop",
    artwork:"/images/wildchild-alex-warren.png",
    artistImage:"/images/artist-alex-warren.png",
    color:["#38bdf8","#0ea5e9"],
    trackIds:["emerald-eyes-alex-warren","same-stars-alex-warren","passenger-alex-warren","rescuer-alex-warren","cry-wolf-alex-warren","fine-place-to-die-alex-warren","are-you-having-fun-alex-alex-warren","i-miss-you-more-alex-warren","only-thing-left-alex-warren","fever-dream-alex-warren","wont-go-back-again-alex-warren","last-time-alex-warren","wildchild-alex-warren-song"],
    custom:true,
    type:"album"
  },
  {
    id:"album-youll-be-alright-kid-alex-warren",
    title:"You'll Be Alright, Kid",
    artist:"Alex Warren",
    year:2025,
    genre:"Pop",
    artwork:"/images/eternity-alex-warren.png",
    artistImage:"/images/artist-alex-warren.png",
    color:["#245c2a","#6fae3d"],
    trackIds:["eternity-alex-warren","the-outside-alex-warren","first-time-on-earth-alex-warren","bloodline-alex-warren","never-be-far-alex-warren","ordinary-alex-warren","everything-alex-warren","getaway-car-alex-warren","who-i-am-alex-warren","you-cant-stop-this-alex-warren","on-my-mind-alex-warren","burning-down-alex-warren","catch-my-breath-alex-warren","carry-you-home-alex-warren","troubled-waters-alex-warren","heaven-without-you-alex-warren","before-you-leave-me-alex-warren","save-you-a-seat-alex-warren","chasing-shadows-alex-warren","yard-sale-alex-warren","youll-be-alright-kid-alex-warren"],
    custom:true,
    type:"album"
  },
  {
    id:"overcome-alexandra-burke",
    title:"Overcome",
    artist:"Alexandra Burke",
    year:2009,
    genre:"Pop",
    artwork:"/images/overcome-alexandra-burke.png",
    artistImage:"/images/artist-alexandra-burke.jpg",
    trackIds:[],
    custom:true,
    type:"album"
  },
  {
    id:"visitor-deluxe-sienna-spiro",
    title:"Visitor (Deluxe)",
    artist:"SIENNA SPIRO",
    year:2026,
    genre:"Pop",
    artwork:"/images/the-visitor-sienna-spiro.png",
    artistImage:"/images/artist-sienna-spiro.jpg",
    color:["#6f2b12","#d08a52"],
    trackIds:[
      "this-is-my-house-sienna-spiro",
      "sienna-were-not-in-love",
      "great-expectation-sienna-spiro",
      "sienna-die-on-this-hill",
      "sienna-hes-not-my-baby-im-his",
      "sienna-pure",
      "sienna-the-visitor",
      "sienna-time-you-and-me",
      "sienna-you-stole-the-show",
      "mono-no-aware-sienna-spiro",
      "sienna-maybe",
      "sienna-material-lover",
      "autumn-leaves-sienna-spiro",
      "sienna-you-stole-the-show-revisited",
      "sienna-die-on-this-hill-unplugged"
    ],
    custom:true,
    type:"album"
  },
  {
    id:"visitor-sienna-spiro",
    title:"Visitor",
    artist:"SIENNA SPIRO",
    year:2026,
    genre:"Pop",
    artwork:"/images/the-visitor-sienna-spiro.png",
    artistImage:"/images/artist-sienna-spiro.jpg",
    color:["#6f2b12","#d08a52"],
    trackIds:[
      "this-is-my-house-sienna-spiro",
      "sienna-were-not-in-love",
      "great-expectation-sienna-spiro",
      "sienna-die-on-this-hill",
      "sienna-hes-not-my-baby-im-his",
      "sienna-pure",
      "sienna-the-visitor",
      "sienna-time-you-and-me",
      "sienna-you-stole-the-show",
      "mono-no-aware-sienna-spiro"
    ],
    custom:true,
    type:"album"
  },
  {
    id:"bad-oneda-single",
    title:"BAD",
    artist:"OneDa",
    year:2026,
    genre:"UK Rap",
    artwork:"/images/bad-oneda.png",
    artistImage:"/images/artist-oneda.png",
    trackIds:["bad-oneda"],
    custom:true,
    type:"single"
  },
  {
    id:"when-i-wake-up-christian-gate-single",
    title:"WHEN I WAKE UP",
    artist:"Chri$tian Gate$",
    year:2026,
    genre:"Electronic",
    artwork:"/images/when-i-wake-up-christian-gate.png",
    artistImage:"/images/artist-chritian-gate.png",
    color:["#dfeeff","#9ccaf5"],
    trackIds:["when-i-wake-up-christian-gates"],
    custom:true,
    type:"single"
  }
];

const DEMOS = [
  {id:"clash-dave-stormzy",title:"Clash",artist:"Dave x Stormzy",album:"We’re All Alone In This Together",genre:"UK Rap",color:["#d13b79","#ef6d93"],bpm:0,file:"/audio/clash-dave-stormzy.mp3",length:251.87,artwork:"/images/clash-dave-stormzy.png",plays:303126185},
  {id:"location-dave-burna-boy",title:"Location",artist:"Dave feat. Burna Boy",album:"We’re All Alone In This Together",genre:"UK Rap",color:["#d13b79","#ef6d93"],bpm:0,file:"/audio/location-dave-burna-boy.mp3",length:234.2,artwork:"/images/location-dave-burna-boy.jpg",plays:736749144},
  {"id":"ufo-d-block-europe-aitch","title":"UFO","artist":"D-Block Europe x Aitch","album":"The Blueprint","genre":"UK Rap","color":["#0b4ea2","#4bc8ff"],"bpm":0,"file":"/audio/ufo-d-block-europe-aitch.mp3","length":204.04,"artwork":"/images/ufo-d-block-europe-aitch.png","plays":127433941},
  {id:"barbarian-juice-wrld",title:"Barbarian",artist:"Juice WRLD",album:"Barbarian",genre:"Rap",color:["#3b0a0a","#ef4444"],bpm:0,file:"/audio/Barbarian - Juice Wrld.mp3",length:152.5,artwork:"/images/barbarian-juice-wrld.png",explicit:true,plays:35493413},
  {id:"sienna-the-visitor",title:"The Visitor",artist:"SIENNA SPIRO",album:"The Visitor",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/the-visitor-sienna-spiro.mp4",length:229,artwork:"/images/the-visitor-sienna-spiro.png",plays:170675732},
  {id:"this-is-my-house-sienna-spiro",title:"This Is My House",artist:"SIENNA SPIRO",album:"Visitor (Deluxe)",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/This Is My House - sienna spiro.mp3",length:204,artwork:"/images/artist-sienna-spiro.jpg",plays:12391227},
  {id:"sienna-time-you-and-me",title:"Time, You & Me",artist:"SIENNA SPIRO",album:"Visitor (Deluxe)",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/Time, You & Me - sienna spiro.mp3",length:210,artwork:"/images/artist-sienna-spiro.jpg",plays:11525957},
  {id:"mono-no-aware-sienna-spiro",title:"Mono No Aware",artist:"SIENNA SPIRO",album:"Visitor (Deluxe)",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/Mono No Aware - sienna spiro.mp3",length:195,artwork:"/images/artist-sienna-spiro.jpg",plays:8502350},
  {id:"autumn-leaves-sienna-spiro",title:"Autumn Leaves",artist:"SIENNA SPIRO",album:"Visitor (Deluxe)",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/Autumn Leaves - sienna spiro.mp3",length:167,artwork:"/images/artist-sienna-spiro.jpg",plays:4897400},
  {id:"sienna-you-stole-the-show-revisited",title:"You Stole The Show - Revisited",artist:"SIENNA SPIRO",album:"Visitor (Deluxe)",genre:"Pop",color:["#d9a7c7","#5b86e5"],bpm:0,file:"/audio/You Stole The Show Revisited - sienna spiro.mp3",length:208,artwork:"/images/sienna-spiro-you-stole-the-show.png",plays:6487617},
  {id:"sienna-die-on-this-hill-unplugged",title:"Die On This Hill - Unplugged",artist:"SIENNA SPIRO",album:"Visitor (Deluxe)",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/Die On This Hill Unplugged - sienna spiro.mp3",length:215,artwork:"/images/artist-sienna-spiro.jpg",plays:8252988},
  {id:"sienna-die-on-this-hill",title:"Die On This Hill",artist:"SIENNA SPIRO",album:"Die On This Hill",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/Die On This Hill - Sienna Spiro.mp3",length:217,artwork:"/images/artist-sienna-spiro.jpg",plays:621803091},
  {id:"sienna-pure",title:"Pure",artist:"SIENNA SPIRO",album:"Pure",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/Pure - Sienna Spiro.mp3",length:219,artwork:"/images/artist-sienna-spiro.jpg",plays:67043240},
  {id:"sienna-material-lover",title:"Material Lover - from The Devil Wears Prada 2 Original Motion Picture",artist:"SIENNA SPIRO",album:"Material Lover",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/Material Lover from The Devil Wears Prada 2 Original Motion Picture - sienna spiro.mp3",length:178,artwork:"/images/artist-sienna-spiro.jpg",plays:126624543},
  {id:"rain-aitch-aj-tracey",title:"Rain",artist:"Aitch x AJ Tracey ft. Tay Keith",album:"Rain",genre:"UK Rap",color:["#8b5cf6","#f97316"],bpm:0,file:"/audio/rain-aitch-aj-tracey-ft-tay-keith.mp4",length:185,artwork:"/images/rain-aitch-aj-tracey.png",plays:268214963},
  {id:"sienna-you-stole-the-show",title:"You Stole The Show",artist:"SIENNA SPIRO",album:"You Stole The Show",genre:"Pop",color:["#d9a7c7","#5b86e5"],bpm:0,file:"/audio/you-stole-the-show-sienna-spiro.mp3",length:207,artwork:"/images/sienna-spiro-you-stole-the-show.png",plays:212847314},
  {id:"sienna-maybe",title:"MAYBE.",artist:"SIENNA SPIRO",album:"MAYBE.",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/MAYBE. - sienna spiro.mp3",length:235,artwork:"/images/artist-sienna-spiro.jpg",plays:193763835},
  {id:"sienna-hes-not-my-baby-im-his",title:"He’s Not My Baby, I’m His",artist:"SIENNA SPIRO",album:"He’s Not My Baby, I’m His",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/He s Not My Baby I m His - sienna spiro.mp3",length:159,artwork:"/images/artist-sienna-spiro.jpg",plays:21512413},
  {id:"sienna-were-not-in-love",title:"We’re Not In Love",artist:"SIENNA SPIRO",album:"We’re Not In Love",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/were not in love - sienna spiro.mp3",length:179,artwork:"/images/artist-sienna-spiro.jpg",plays:15272055},
  {id:"sienna-back-to-blonde",title:"BACK TO BLONDE",artist:"SIENNA SPIRO",album:"BACK TO BLONDE",genre:"Pop",color:["#6f2b12","#d08a52"],bpm:0,file:"/audio/BACK TO BLONDE - sienna spiro.mp3",length:164,artwork:"/images/back-to-blonde-sienna-spiro.png",explicit:true,plays:50600077},
  {id:"alexandra-burke-hallelujah",title:"Hallelujah",artist:"Alexandra Burke",album:"Hallelujah",genre:"Pop",color:["#b9a05a","#111111"],bpm:0,file:"/audio/alexandra-burke-hallelujah.mp3",length:215,artwork:"/images/alexandra-burke-hallelujah.png",plays:129097229},
  {id:"bella-kay-iloveitiloveitiloveit",title:"iloveitiloveitiloveit",artist:"Bella Kay",album:"",genre:"Pop",color:["#3f1738","#ff6ea8"],bpm:0,file:"/audio/bella-kay-iloveitiloveitiloveit.mp3",length:180,artwork:"/images/bella-kay-iloveitiloveitiloveit.png",plays:437309782},
  {id:"thiago-silva-dave-aj-tracey",title:"Thiago Silva",artist:"Dave x AJ Tracey",album:"Thiago Silva",genre:"UK Rap",color:["#111111","#7f1d1d"],bpm:0,file:"/audio/thiago-silva-dave-aj-tracey.mp3",length:202.33,artwork:"/images/thiago-silva-dave-aj-tracey.png",plays:307204446},
  {id:"bad-oneda",title:"BAD",artist:"OneDa",album:"BAD",genre:"UK Rap",color:["#241044","#7c3aed"],bpm:0,file:"/audio/bad-oneda.mp4",length:148.35,artwork:"/images/bad-oneda.png",plays:1220},
  {id:"numb-christian-gates",title:"NUMB",artist:"Chri$tian Gate$",album:"",genre:"Electronic",color:["#420a0a","#9f1239"],bpm:0,file:"/audio/NUMB - Chri$tian Gate$.mp3",length:112,artwork:"/images/numb-christian-gate.png",plays:187439037},
  {id:"i-wont-beg-for-you-christian-gates",title:"I Won't Beg for You",artist:"Chri$tian Gate$",album:"",genre:"Electronic",color:["#1b1b1b","#e11d48"],bpm:0,file:"/audio/i won't beg for you - Chri$tian gate$.mp3",length:123,artwork:"/images/i-wont-beg-for-you-christian-gate.png",plays:98216857},
  {id:"dangerous-state-of-mind-christian-gates",title:"Dangerous State of Mind",artist:"Chri$tian Gate$",album:"",genre:"Electronic",color:["#3b1d00","#f59e0b"],bpm:0,file:"/audio/Dangerous State Of Mind - Chri$tian Gate$.mp3",length:115,artwork:"/images/dangerous-state-of-mind-christian-gate.png",plays:84588614},
  {id:"arson-christian-gates",title:"ARSON",artist:"Chri$tian Gate$",album:"",genre:"Electronic",color:["#111827","#f97316"],bpm:0,file:"/audio/ARSON - Chri$tian Gate$.mp3",length:137,artwork:"/images/arson-christian-gate.png",plays:22018439},
  {id:"when-i-wake-up-christian-gates",title:"WHEN I WAKE UP",artist:"Chri$tian Gate$",album:"WHEN I WAKE UP",genre:"Electronic",color:["#dfeeff","#9ccaf5"],bpm:0,file:"/audio/WHEN I WAKE UP - Chri$tian Gate$.mp3",length:240,artwork:"/images/when-i-wake-up-christian-gate.png",plays:104044},
  {id:"overwhelmed-christian-gates-remix",title:"overwhelmed - Chri$tian Gate$ remix",artist:"Chri$tian Gate$",album:"",genre:"Electronic",color:["#0f172a","#38bdf8"],bpm:0,file:"/audio/overwhelmed - Chri$tian Gate$ remix - Royal & the Serpent, Chri$tian Gate$.mp3",length:134,artwork:"/images/overwhelmed-christian-gate.png",plays:105771981},
  {id:"balling-vibe-chemistry",title:"Balling (feat. Songer, Mr Traumatik, Devilman & OneDa)",artist:"Vibe Chemistry",featuredArtists:["OneDa"],album:"",genre:"UK Rap",color:["#0d2b52","#31c7f2"],bpm:0,file:"/audio/balling-vibe-chemistry.mp3",length:266.352,artwork:"/images/balling-vibe-chemistry.png",explicit:true,plays:48261008},
  {id:"eternity-alex-warren",title:"Eternity",artist:"Alex Warren",album:"",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"/audio/eternity-alex-warren.mp3",length:189.701224,artwork:"/images/eternity-alex-warren.png",plays:456232387},
  {id:"the-outside-alex-warren",title:"The Outside",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:183,artwork:"/images/eternity-alex-warren.png",plays:38680549},
  {id:"first-time-on-earth-alex-warren",title:"First Time On Earth",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:161,artwork:"/images/eternity-alex-warren.png",plays:41317575},
  {id:"bloodline-alex-warren",title:"Bloodline",artist:"Alex Warren, Jelly Roll",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:182,artwork:"/images/eternity-alex-warren.png",plays:374157047},
  {id:"never-be-far-alex-warren",title:"Never Be Far",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:197,artwork:"/images/eternity-alex-warren.png",plays:33762115},
  {id:"ordinary-alex-warren",title:"Ordinary",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:186,artwork:"/images/eternity-alex-warren.png",plays:2176153082},
  {id:"everything-alex-warren",title:"Everything",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:168,artwork:"/images/eternity-alex-warren.png",plays:44590781},
  {id:"getaway-car-alex-warren",title:"Getaway Car",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:184,artwork:"/images/eternity-alex-warren.png",plays:22186344},
  {id:"who-i-am-alex-warren",title:"Who I Am",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:202,artwork:"/images/eternity-alex-warren.png",plays:14054189},
  {id:"you-cant-stop-this-alex-warren",title:"You Can't Stop This",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:161,artwork:"/images/eternity-alex-warren.png",plays:57024776},
  {id:"on-my-mind-alex-warren",title:"On My Mind",artist:"Alex Warren, ROSE",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:189,artwork:"/images/eternity-alex-warren.png",plays:148510910},
  {id:"burning-down-alex-warren",title:"Burning Down",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:179,artwork:"/images/eternity-alex-warren.png",plays:340079648},
  {id:"catch-my-breath-alex-warren",title:"Catch My Breath",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:192,artwork:"/images/eternity-alex-warren.png",plays:39131514},
  {id:"carry-you-home-alex-warren",title:"Carry You Home",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:166,artwork:"/images/eternity-alex-warren.png",plays:830147251},
  {id:"troubled-waters-alex-warren",title:"Troubled Waters",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:197,artwork:"/images/eternity-alex-warren.png",plays:179410467},
  {id:"heaven-without-you-alex-warren",title:"Heaven Without You",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:202,artwork:"/images/eternity-alex-warren.png",plays:40977099},
  {id:"before-you-leave-me-alex-warren",title:"Before You Leave Me",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:176,artwork:"/images/eternity-alex-warren.png",plays:534356152},
  {id:"save-you-a-seat-alex-warren",title:"Save You a Seat",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:197,artwork:"/images/eternity-alex-warren.png",plays:253976044},
  {id:"chasing-shadows-alex-warren",title:"Chasing Shadows",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:164,artwork:"/images/eternity-alex-warren.png",plays:200816570},
  {id:"yard-sale-alex-warren",title:"Yard Sale",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:174,artwork:"/images/eternity-alex-warren.png",plays:67517297},
  {id:"youll-be-alright-kid-alex-warren",title:"You'll Be Alright, Kid",artist:"Alex Warren",album:"You'll Be Alright, Kid",genre:"Pop",color:["#244b2f","#d8a36a"],bpm:0,file:"",length:149,artwork:"/images/eternity-alex-warren.png",plays:51596836},
  {id:"emerald-eyes-alex-warren",title:"Emerald Eyes",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/EMERALD EYES - Alex Warren.mp3",length:156,artwork:"/images/wildchild-alex-warren.png",plays:10813860},
  {id:"same-stars-alex-warren",title:"Same Stars",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/SAME STARS - Alex Warren.mp3",length:199,artwork:"/images/wildchild-alex-warren.png",plays:4507794},
  {id:"passenger-alex-warren",title:"Passenger",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/PASSENGER - Alex Warren.mp3",length:159,artwork:"/images/wildchild-alex-warren.png",plays:42991799},
  {id:"rescuer-alex-warren",title:"Rescuer",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/RESCUER - Alex Warren.mp3",length:199,artwork:"/images/wildchild-alex-warren.png",plays:17835209},
  {id:"cry-wolf-alex-warren",title:"Cry Wolf",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/CRY WOLF - Alex Warren.mp3",length:161,artwork:"/images/wildchild-alex-warren.png",explicit:true,plays:7607652},
  {id:"fine-place-to-die-alex-warren",title:"Fine Place To Die",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/FINE PLACE TO DIE - Alex Warren.mp3",length:187,artwork:"/images/wildchild-alex-warren.png",plays:46977685},
  {id:"are-you-having-fun-alex-alex-warren",title:"Are You Having Fun, Alex?",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/ARE YOU HAVING FUN, ALEX - Alex Warren.mp3",length:86,artwork:"/images/wildchild-alex-warren.png",plays:1954265},
  {id:"i-miss-you-more-alex-warren",title:"I Miss You More",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/I MISS YOU MORE - Alex Warren.mp3",length:184,artwork:"/images/wildchild-alex-warren.png",plays:4045742},
  {id:"only-thing-left-alex-warren",title:"Only Thing Left",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/ONLY THING LEFT - Alex Warren.mp3",length:214,artwork:"/images/wildchild-alex-warren.png",plays:2821896},
  {id:"fever-dream-alex-warren",title:"Fever Dream",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/FEVER DREAM - Alex Warren.mp3",length:153,artwork:"/images/wildchild-alex-warren.png",plays:279187544},
  {id:"wont-go-back-again-alex-warren",title:"Won't Go Back Again",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/WONT GO BACK AGAIN - Alex Warren.mp3",length:168,artwork:"/images/wildchild-alex-warren.png",plays:3868243},
  {id:"last-time-alex-warren",title:"Last Time",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/LAST TIME - Alex Warren.mp3",length:196,artwork:"/images/wildchild-alex-warren.png",plays:2439233},
  {id:"wildchild-alex-warren-song",title:"Wildchild",artist:"Alex Warren",album:"WILDCHILD",genre:"Pop",color:["#223b2f","#92b56f"],bpm:0,file:"/audio/WILDCHILD - Alex Warren.mp3",length:247,artwork:"/images/wildchild-alex-warren.png",plays:2533102},
  {id:"let-me-in-oneda",title:"Let Me In",artist:"OneDa",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"/audio/let-me-in-oneda.mp4",length:219.566667,artwork:"/images/formula-oneda.png",explicit:true,plays:70786},
  {id:"major-pay-oneda-renee-stormz",title:"Major Pay",artist:"OneDa, Renee Stormz",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"/audio/major-pay-oneda-renee-stormz.mp4",length:208.116667,artwork:"/images/formula-oneda.png",explicit:true,plays:36793},
  {id:"the-formula-oneda",title:"The Formula",artist:"OneDa",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"/audio/The Formula - OneDa.mp3",length:83,artwork:"/images/formula-oneda.png",explicit:true,plays:4249},
  {id:"raised-oneda",title:"Raised",artist:"OneDa",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"/audio/Raised - OneDa.mp3",startOffset:1,length:134,artwork:"/images/formula-oneda.png",explicit:true,plays:5801},
  {id:"over-my-dead-body-oneda",title:"Over My Dead Body",artist:"OneDa, PRIDO",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"/audio/Over My Dead Body - OneDa, PRIDO.mp3",startOffset:1,length:186,artwork:"/images/formula-oneda.png",plays:8107},
  {id:"pull-up-oneda",title:"Pull Up",artist:"OneDa, Princethekid",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"/audio/Pull Up - OneDa, Princethekid.mp3",startOffset:1,length:188,artwork:"/images/formula-oneda.png",explicit:true,plays:6211},
  {id:"sometimes-oneda",title:"Sometimes",artist:"OneDa, Ace Clvrk",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"",length:203,artwork:"/images/formula-oneda.png",explicit:true,plays:5461},
  {id:"the-plug-oneda",title:"The Plug",artist:"OneDa, Superlative, Miss Stylie",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"",length:261,artwork:"/images/formula-oneda.png",explicit:true,plays:4980},
  {id:"leader-oneda",title:"Leader",artist:"OneDa",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"",length:223,artwork:"/images/formula-oneda.png",explicit:true,plays:6186},
  {id:"the-western-way-oneda",title:"The Western Way",artist:"OneDa",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"",length:239,artwork:"/images/formula-oneda.png",explicit:true,plays:44745},
  {id:"superwoman-oneda",title:"Superwoman",artist:"OneDa",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"",length:219,artwork:"/images/formula-oneda.png",explicit:true,plays:11335},
  {id:"set-it-off-oneda",title:"Set It Off",artist:"OneDa",album:"Formula OneDa",genre:"UK Rap",color:["#ef302f","#16a34a"],bpm:0,file:"/audio/set-it-off-oneda.mp4",length:244.4,artwork:"/images/formula-oneda.png",explicit:true,plays:152188},
  {id:"flowers-say-my-name-arrdee",title:"Flowers (Say My Name)",artist:"ArrDee",album:"Flowers (Say My Name)",genre:"UK Rap",color:["#b7ff3c","#20e3ff"],bpm:0,file:"/audio/flowers-say-my-name-arrdee.mp3",length:152,artwork:"/images/flowers-arrdee.png",explicit:true,plays:156614184},
  {id:"great-expectation-sienna-spiro",title:"Great Expectation",artist:"SIENNA SPIRO",album:"Great Expectation",genre:"Pop",color:["#d9a7c7","#5b86e5"],bpm:0,file:"/audio/great-expectation-sienna-spiro.mp3",length:163,artwork:"/images/great-expectation-sienna-spiro.png",plays:121836071},
  {id:"sf-cypher-24",title:"SF Cypher 24",artist:"Toddla T, STEEZE FACTORY, BackRoad Gee, OneDa, Milli Major, Reepa, ZOELLZ, Teewhy, N3, Spektive",album:"SF Cypher 24",genre:"UK Rap",color:["#20e3ff","#b7ff3c"],bpm:0,file:"/audio/sf-cypher-24.mp3",length:0,artwork:"/images/sf-cypher-24-toddla-t.png",explicit:true,plays:29721},
];

const lyricTime = stamp => {
  const [minutes, seconds] = stamp.split(":").map(Number);
  return minutes * 60 + seconds;
};

const LYRICS = {
  "barbarian-juice-wrld": [[0.99,"Uh-huh (Uh-huh, uh-huh)"],[1.66,"Sipping codeine, in love with the medicine (Uh-huh, yeah)"],[5.21,"I need codeine, in love with the medicine (Yeah)"],[6.92,"I'ma sip till I get an impediment (Yeah)"],[8.49,"Ballin' hard, I think I need a letterman (Oh-oh)"],[11.31,"Uh-huh, uh (Let's go, let's go)"],[13.73,""] ,[13.73,"I need codeine, in love with the medicine (What else?)"],[15.42,"I'ma sip till I get an impediment (What else?)"],[17.16,"I'ma ball till they get me a letterman (What else?)"],[18.95,"At the door knockin', they better let me in (What else?)"],[20.55,"Scooby-Doo as a kid, I was meddlin' (What else?)"],[22.31,"Kobe Bryant, the Rock, I was handlin' (What the fuck else?)"],[23.92,"I won't fuck on a bitch if she scandalous (What the fuck else?)"],[25.59,"Tear this shit up, I'll show you what a vandal is (What the fuck else?)"],[27.44,"I'm a victim of father abandonment (On God)"],[29.15,"As a bastard, I had to go get this shit (On God)"],[30.90,"As a bastard, I glowed up, I'm rich as shit (On God)"],[32.36,"Stunt on a goofy ****, it's embarrassing (Yeah, yeah)"],[34.19,"Hit new Lenox, I'm finna Burberry it (On God)"],[35.87,"Fill a Louis bag with money, then bury it (On God)"],[37.54,"Catch a body, bag it up and I bury it (On God)"],[39.26,"**** is bitches, on they Tyler Perry shit (Yeah)"],[41.42,"Gotta expose 'em, yeah, yeah, yeah (Uh)"],[42.99,"Shoot and reload it, yeah, yeah, yeah (Uh-huh, grrah)"],[44.46,"He a ho and he know it, yeah, yeah, yeah (Yeah)"],[46.43,"So I had to show 'em, yeah, yeah, yeah (Yeah)"],[48.14,"Codeine, I'ma pour it, yeah, yeah, yeah (What else?)"],[49.67,"With these words, I'm a poet, yeah, yeah, yeah (What else?)"],[51.45,"These words, I'm a poet, poet (Yeah)"],[53.44,"Fuck all that talkin', let's do it (Yeah)"],[55.07,"I don't drink beer, but I brew 'em (Yeah)"],[56.85,"\"Homina-homina,\" when I fuck her"],[58.57,"Good brain but she stupid (Yeah)"],[60.24,"Raw dog with no rubber (Yeah)"],[61.55,"My **** say I'm fuckin' her stupid (Yeah)"],[63.70,"Guess I'm young and stupid (Yeah)"],[64.97,"After I nut, make her shuffle like Cupid (Yeah, what else?)"],[66.94,"Or an iPod switchin' up music, yeah"],[68.63,"I need codeine, in love with the medicine (What else?)"],[70.31,"I'ma sip till I get an impediment (What else?)"],[71.98,"I'ma ball till they get me a letterman (What else?)"],[73.73,"At the door knockin', they better let me in (What else?)"],[75.28,"Scooby-Doo as a kid, I was meddlin' (What else?)"],[77.21,"Kobe Bryant, the Rock, I was handlin' (What the fuck else?)"],[78.89,"I won't fuck on a bitch if she scandalous (What the fuck else?)"],[80.44,"Tear this shit up, I'll show you what a vandal is (What the fuck else?)"],[82.81,"I'm high off of the ground, clouds chasin' (For real)"],[86.04,"These hoes go around clout chasin' (For real)"],[89.37,"Perc and Molly mixed got my heart racing (Yeah)"],[92.85,"I don't think I'ma never come down from this (No, no, no, no)"],[95.84,"She wanna fuck with my team, she an animal (Yeah)"],[97.60,"Won't eat her out even though I'm a cannibal (Yeah)"],[99.09,"Her friend on the other hand, her friend is edible (Yeah)"],[100.92,"I ate her out and the pussy taste incredible (Yeah)"],[102.73,"Beat up the box like I'm Mr. Incredible (Yeah)"],[104.37,"Or maybe Mike Tyson, I'm Mr. Impeccable (Ya' dig?)"],[106.12,"I remember eating Ramen and Lunchables (Whew)"],[107.86,"Now I throw Ruth Chris' away like it's Lunchables (Rich)"],[109.58,"Magazine on the AK, it's bananas (Grrah)"],[111.20,"I got it for **** that don't mind their manners (Grrah)"],[112.94,"Pull up in that Phantom, feel like Danny Phantom (Skrrt)"],[114.54,"My drip super radical, it'll dismantle you (Yeah)"],[116.38,"She told me she wanna fuck on a **** (Uh)"],[118.24,"Don't ride on something that you cannot handle (Uh)"],[119.81,"Slurp this dick like soup, no Campbells (Uh)"],[121.62,"After that, pour up a four of the Fanta (Lean)"],[123.94,"I need codeine, in love with the medicine (What else?)"],[125.17,"I'ma sip till I get an impediment (What else?)"],[126.91,"I'ma ball till they get me a letterman (What else?)"],[128.65,"At the door knockin', they better let me in (What else?)"],[130.28,"Scooby-Doo as a kid, I was meddlin' (What else?)"],[132.01,"Kobe Bryant, the Rock, I was handlin' (What the fuck else?)"],[133.75,"I won't fuck on a bitch if she scandalous (What the fuck else?)"],[135.22,"Tear this shit up, I'll show you what a vandal is (What the fuck else?)"],[138.81,"Oh my god, he's gonna bring his girl out"],[142.45,"I heard he always brings her out at this part, this is so cute"],[147.46,"All my ladies, put your hands up right now!"]],
  "bella-kay-iloveitiloveitiloveit": [[7.51,"I like being used, it means I have a purpose"],[14.12,"It's the little things you do, at least you're being earnest"],[20.14,"Oh, maybe I'm too fragile, or maybe you're too mean"],[26.83,"I've never been real good at deciphering things"],[32.88,"Let's let fate decide"],[35.41,"Heads, we go to yours, tails, we go to mine"],[39.13,"You're a bad idea"],[42.52,"But a real good time"],[46.14,"Oh, and I'd be lying if I said I didn't love it 'cause I do"],[50.20,"I'm a couple minutes out from relapsing into you"],[53.38,"Oh, fuck it, baby, I love it"],[58.25,"I love it, I love it, I"],[60.46,"I love it when we fight, and I like it when you're mean"],[63.75,"We don't have to get into what that says about me"],[66.81,"Oh, shut it, baby, I love it"],[71.65,"I love it, I love it, I"],[74.67,"I could tell you the truth, but first, you've gotta earn it"],[80.97,"Don't gotta lasso the moon, just tell me that I'm perfect"],[87.18,"Oh, maybe I'm too easy, or maybe you're too hard"],[93.92,"I've always been real good at taking it too far"],[100.01,"Let's let fate decide"],[102.56,"Heads we go to yours, tails we go to mine"],[106.40,"You're a bad idea"],[109.61,"But a real good time"],[113.22,"Oh, and I'd be lying if I said I didn't love it 'cause I do"],[117.51,"I'm a couple minutes out from relapsing into you"],[120.52,"Oh, fuck it, baby, I love it"],[125.40,"I love it, I love it, I"],[127.60,"I love it when we fight, and I like it when you're mean"],[130.93,"We don't have to get into what that says about me"],[133.94,"Oh, shut it, baby, I love it"],[138.86,"I love it, I love it, I"],[141.20,"I'm a couple minutes out from relapsing"],[144.57,"Do you remember the last time this happened?"],[148.08,"Baby, relax, sometimes it happens"],[151.40,"Baby, relax, sometimes it happens"],[155.00,"I'm a couple minutes out from relapsing"],[158.16,"Is the key still under the mat?"],[161.11,"Can you imagine? The last time this happened"],[164.58,"I, I, I loved it, I loved it, I"],[167.58,"I'd be lying if I said I didn't love it 'cause I do"],[171.12,"I'm a couple minutes out from relapsing into you"],[174.22,"Oh, fuck it"],[177.04,"I only love it 'cause it's you"]],
  "ufo-d-block-europe-aitch": [[8.64,"Yeah, Cali weed, alcohol, I'm off my face again"],[11.48,"I took some Molly, now I'm lookin' like an alien"],[13.9,"I'll do you well, so well"],[16.42,"Let's do drugs before we fuck and fuck in space again (Ski)"],[18.84,""],[18.84,"Oh, my, I'm waved"],[21.22,"Too much, I don't know what to say"],[23.46,"I'll do you well, so well"],[25.93,"The girl bad, bad, she goin' through a phase"],[28.44,"Oh, I'm amazed"],[30.53,"Pretty pink toes, lookin' like the figure eight"],[33.06,"I'll treat you well, so well (So, so well)"],[35.62,"Young rich ****, really fuckin' paid (So well)"],[38.23,""],[38.04,"She a smart bad bitch, she be single all summer (All summer)"],[40.9,"But she'll bag a footballer for the winter (For the winter)"],[43.38,"Fuck the rap beef, thirty round drummer (Round drummer)"],[45.8,"We'll shoot your tour bus, shoot your Sprinter (Yeah)"],[47.5,"I gave some white to my white girl (Ski, ski)"],[49.9,"Me and my brown ting just blow trees (Ski, ski)"],[52.27,"Open my Louis bag, ooh-eee (Ski, ski)"],[54.7,"Open your mouth, darlin', force feed, ha"],[57.22,"I said, \"Baby, I'm a pro, your man a rookie\" (Rookie)"],[59.51,"You ever had a drug dealer eat your pussy? (Eat your pussy)"],[61.92,"You ever had a shot caller make you tap out?"],[64.1,"Argued with my **** cah he fuckin' left the MAC out, fool"],[67.14,"Cappin' on the net till you get stab out, ooh"],[69.55,"I'ma earn a slab out, 'bout to bust the pack down"],[71.94,"Can't afford a pat down, loud is full of ganja"],[74.02,"And I told him bring the money, mañana"],[76.82,""],[76.42,"Oh, my, I'm waved (Ski)"],[78.81,"Too much, I don't what to say (Ski, ski)"],[81.06,"I'll do you well, so well"],[83.54,"The girl bad, bad, she goin' through a phase (Ski, ski)"],[86.02,"Oh, I'm amazed"],[88.12,"Pretty pink toes, lookin' like the figure eight"],[90.66,"I'll treat you well, so well (So, so well)"],[93.2,"Young rich ****, really fuckin' paid (So, so well)"],[96.51,""],[96.14,"Colombiana, some big titties and slim waist (Aye)"],[98.6,"Bust it open in motion, don't make no mistakes"],[101.04,"I might lick it a little to see how it taste"],[103.41,"Finger fuck with my Rollie on, I got wrist ache"],[105.84,"Left the crib with a ripped up tee"],[107.72,"Paid racks for her tits, got her lips done cheap (Yeah)"],[110.5,"You roll with Aitch, you know the bill come free"],[112.44,"She don't fuck with white boys, but she still fuck me"],[114.72,"You ever had a millionaire eat your pussy? (Mmm)"],[117.26,"Let her flex the plain jane or wear the bussie (Alright)"],[119.52,"She popped a pill and told me, \"Fuck me till it's gushy\""],[121.79,"Asked me what my type is, I just told her, \"I ain't fussy\" (Uh-uh)"],[124.3,"She fucked with London till I brought her up to Manny (M-town)"],[126.84,"Got her squirtin' when I choke her, she a baddie (Aye, aye)"],[129.25,"I ain't beefin' with your ex, the boy a patty"],[131.07,"Got about two-hundred thousand pounds of jewellery in the taxi (Skrrt)"],[134.32,""],[134.05,"Oh, my, I'm waved (Ski)"],[136.43,"Too much, I don't what to say (Ski, ski)"],[138.7,"I'll do you well, so well"],[141.14,"The girl bad, bad, she goin' through a phase (Ski, ski, ski)"],[143.62,"Oh, I'm amazed"],[145.75,"Pretty pink toes, lookin' like the figure eight"],[148.27,"I treat you well, so well (So, so well)"],[150.81,"Young rich ****, really fuckin' paid (So, so, so well)"],[154.14,""],[152.62,"Yeah, I'ma cover my pain with these shades (Yeah)"],[155.68,"I'ma cover my eyes with Cartier"],[158.03,"And we never go to party 'cause my **** catch a body"],[160.47,"Girl, I'd rather smoke weed and chill and taste it (Skrrt, skrrt)"],[162.72,"I get you Dior for your trainers, but we never go on dates (Uh)"],[165.54,"Girl, wash your pussy 'fore I eat, I'm gonna wait (Uh)"],[167.62,"Two-thousand for my trainers, yes, I got them from LA"],[170.03,"Gave my dentist eight-thousand, told him \"Make my teeth straight\""],[172.43,"I'm lit, I'm high"],[174.8,"And I swear, I'll eat that pussy all night"],[177.22,"And I brought this codeine for the vibes"],[179.5,"I got a flight in couple hours, she said, \"One more time\" (Skrrt, skrrt)"],[182.77,""],[182.06,"Oh, my, I'm waved (Ski)"],[184.44,"Too much, I don't what to say (Ski, ski)"],[186.6,"I'll do you well, so well"],[189.12,"The girl bad, bad, she goin' through a phase (Ski, ski)"],[191.64,"Oh, I'm amazed"],[193.64,"Pretty pink toes, lookin' like the figure eight"],[196.28,"I'll treat you well, so well (So, so well)"],[198.8,"Young rich ****, really fuckin' paid (So, so, so well)"]],
  "sienna-the-visitor": [
    [19.71, "We lay on towers, on rented time"],
    [27.11, "I'm yours for hours, you're always mine"],
    [34.57, "All things expire, I know you won't stay"],
    [41.76, "But I seem to inspire you to say"],
    [49.76, "Say that you love me, say I'm all you need"],
    [56.86, "In the back of my mind, I know I'm temporary"],
    [62.70, "You're holding me for the night"],
    [66.10, "For some pleasure if that's all we are"],
    [70.76, "Know I'll always be a visitor, mmm"],
    [77.74, "In your arms"],
    [86.58, "It's in my nature to be cynical"],
    [93.79, "I want to be remembered, so I get hysterical"],
    [101.67, "I wanna be that one thing, some' special to you"],
    [108.61, "Say you won't forget me, but you always do"],
    [116.36, "Then say that you love me, say I'm all you need"],
    [123.80, "In the back of my mind, I know I'm temporary"],
    [129.71, "You're holding me for the night"],
    [132.96, "For some pleasure if that's all we are"],
    [137.66, "Know I'll always be a visitor, mmm"],
    [144.67, "In your arms"],
    [152.08, "In your arms"],
    [156.97, "Oh"],
    [172.07, "In your arms"],
    [177.58, "Say that you love me, say I'm all you need"],
    [185.90, "In the back of my mind, I know I'm temporary"],
    [192.16, "You're holding me for the night"],
    [195.72, "For some pleasure if that's all we are"],
    [201.30, "Know I'll always be a visitor"],
    [209.85, "Know I'll always be a visitor"],
    [215.51, "In your arms"]
  ],
  "rain-aitch-aj-tracey": [
    [10.00, "Yeah"],
    [10.56, "(Tay Keith, fuck these niggas up)"],
    [14.69, "I said, \"Say my name\" (say it)"],
    [16.42, "First class flight to L.A"],
    [17.52, "as soon as I land"],
    [18.20, "bill a paper plane (uh)"],
    [19.49, "Soon touch back in the ends"],
    [20.40, "One-ten on the M"],
    [21.18, "tryna' take a chase (skrrt-skrrt)"],
    [22.85, "Big fat stack in my bag"],
    [23.64, "when I un-zip that"],
    [24.34, "finna make it rain"],
    [25.87, "Cuh, when we run down, it's rain"],
    [27.20, "Right wrist and left wrist, that's rain"],
    [28.48, "She said, \"Wagwan, what's going on?\""],
    [30.27, "\"Why am I wet?\" Gyal, that's rain"],
    [31.99, "Cuh, when we run down, it's rain"],
    [33.32, "Right wrist and left wrist, that's rain"],
    [34.88, "She said, \"Wagwan, what's going on?\""],
    [36.46, "\"Why am I wet?\""],
    [37.22, "Gyal, that's rain (yeah)"],
    [40.21, "Me and ocky doin' up money"],
    [41.09, "Gyal on curry"],
    [42.05, "neck McFlurry (bling-blaow)"],
    [43.16, "When you stack your receipts"],
    [44.19, "that's funny (ha)"],
    [44.87, "Your jeans say P's"],
    [45.35, "but your bank says bummy (ah)"],
    [46.46, "I was looney before I made tunes"],
    [47.41, "Now I'm AJ but my"],
    [48.20, "AP's Bugs Bunny (bling)"],
    [49.46, "Big boogers in my watch"],
    [50.35, "that's runny (blaow)"],
    [51.14, "No drip, when I flick this"],
    [51.90, "man hurry (ching)"],
    [52.65, "I got the gyal of your dreams"],
    [53.50, "on her knees"],
    [54.24, "In my inbox"],
    [54.73, "tryna call AJ 'honey' (muah)"],
    [55.92, "I go tape, make it rain or sunny"],
    [57.43, "I came from the dirt"],
    [57.99, "so we keep shit muddy (yeah)"],
    [59.15, "Arabic gyal"],
    [59.69, "big rocks is flooded (yeah)"],
    [60.65, "See me"],
    [61.20, "the habibti's dem love it (muah)"],
    [62.19, "All up on a bitch, Kante, man shovin'"],
    [63.31, "Mcglovin', run jokes, get blooded (baow-baow)"],
    [65.44, "These kicks on my feet"],
    [66.26, "from Virgil No Van Dijk"],
    [67.78, "I'm on slime like Keenan"],
    [68.47, "Bro got the cannon"],
    [69.11, "he'll bang it no reason (baow)"],
    [70.01, "Since '08"],
    [70.63, "it's been get money season (baow-baow)"],
    [72.31, "It's like girl, lets get it (yeah)"],
    [73.54, "Spent mans drip on the jail"],
    [74.24, "tek credit (brr)"],
    [74.89, "Got smoke for the opps"],
    [75.45, "but they think that's deaded"],
    [76.28, "Snake show skin around"],
    [76.98, "me and get shedded (baow-baow)"],
    [78.76, "I said, \"Say my name\" (woo)"],
    [79.73, "First class flight to L.A"],
    [81.09, "as soon as I land"],
    [81.88, "bill a paper plane (uh)"],
    [83.38, "Soon touch back in the ends"],
    [84.29, "One-ten on the M"],
    [85.38, "tryna' take a chase (skrrt-skrrt)"],
    [86.68, "Big fat stack in my bag"],
    [87.38, "when I un-zip that"],
    [88.39, "finna' make it rain"],
    [89.86, "Cuh, when we run down, it's rain (splash)"],
    [91.21, "Right wrist and left wrist, that's rain (bling)"],
    [92.52, "She said, \"Wagwan, what's going on?\""],
    [94.23, "\"Why am I wet?\""],
    [94.96, "Gyal, that's rain (blaow)"],
    [95.84, "Cuh, when we run down, it's rain (splash)"],
    [97.38, "Right wrist and left wrist, that's rain (bling)"],
    [98.79, "She said \"Wagwan, what's going on?\" (huh? what?)"],
    [100.47, "\"Why am I wet?\""],
    [101.27, "Gyal, that's rain (blaow, woo)"],
    [102.95, "Yeah, sick of some rappers and that"],
    [104.50, "But I stay doing me"],
    [105.33, "never cap on a track (wah?)"],
    [106.85, "Gelato pack in the bag"],
    [107.94, "Then I throw up a M"],
    [108.89, "got the map on my back (uh)"],
    [110.02, "She make it clap for the snap, yeah"],
    [111.42, "The back wasn't bad but there's no"],
    [111.96, "way I'm tackling that (no)"],
    [112.94, "I'm wit' ya gyal on some"],
    [114.28, "'yac in a gaff"],
    [114.85, "Bro tryna stack in the trap (stack in the trap)"],
    [116.70, "Said I'm too young"],
    [117.35, "and my game's all talk"],
    [118.19, "But she got buss down"],
    [118.87, "like AJ's chain"],
    [119.84, "And psycho, drama, the bitch like Dave"],
    [120.86, "Yo, what can I say?"],
    [121.88, "Man, the brain's insane (ah-ah)"],
    [122.95, "Ten for the two-toe subby and ten"],
    [124.12, "For the new blueface"],
    [125.11, "when I rate 'em plain (yeah, aight)"],
    [126.56, "Still come through and make it rain"],
    [127.66, "Turn up, stay lit, burn up, get paid"],
    [128.76, "Two-two peng ones giving man stress"],
    [130.72, "I delete 'em both"],
    [131.40, "I'm so indecisive (woo)"],
    [132.72, "Next gyal tryna attack man"],
    [134.16, "goin' on crazy but I think I like it (woo)"],
    [136.01, "More time, I lose my head but then I get stressed"],
    [137.67, "and it's so hard to find it"],
    [139.38, "Think I got time for a side chick?"],
    [140.66, "No way, this not ridin' in my whip (skrrt)"],
    [142.76, "I said, \"Say my name\" (say it)"],
    [144.09, "First class flight to L.A"],
    [145.45, "as soon as I land"],
    [146.02, "bill a paper plane (uh)"],
    [147.39, "Soon touch back in the ends"],
    [148.32, "One-ten on the M"],
    [149.11, "tryna' take a chase (skrrt-skrrt)"],
    [150.37, "Big fat stack in my bag"],
    [151.43, "when I un-zip that"],
    [152.25, "finna make it rain"],
    [153.88, "Cuh, when we run down, it's rain"],
    [154.90, "Right wrist and left wrist, that's rain"],
    [156.51, "She said, \"Wagwan, what's going on?\""],
    [158.10, "\"Why am I wet?\" Gyal, that's rain"],
    [159.77, "Cuh, when we run down, it's rain"],
    [161.32, "Right wrist and left wrist, that's rain"],
    [162.85, "She said \"Wagwan, what's going on?\""],
    [164.51, "\"Why am I wet?\" Gyal, that's rain"],
    [166.34, "hahaha"],
    [170.46, "Ah!"]
  ],

  "numb-christian-gates": [
    [0.00, "Right now, I'm laying in bed with nobody to love"],
    [3.21, "And my ex is probably out having fun, hooking up"],
    [5.42, "With the person that she told me not to worry about"],
    [7.61, "But it's alright 'cause we're both numb"],
    [10.08, ""],
    [10.09, "Right now, still feeling lonely as fuck"],
    [12.43, "I don't even have the energy to try to get up"],
    [14.67, "Shoulda never had a girl I gotta worry about"],
    [16.92, "But it's just life when there's no love"],
    [19.47, ""],
    [19.28, "Girl, you know it doesn't bother me"],
    [21.07, "That I'm not with you"],
    [22.17, "But I hope that I'm on your mind"],
    [23.94, "Baby, tell me that you thought of me"],
    [25.59, "'Cause I thought of you"],
    [26.76, "With the girl that I met last night"],
    [28.85, ""],
    [29.30, "I don't wanna live in this fake shit"],
    [31.33, "Don't wanna fake love in relations"],
    [33.67, "We don't gotta make love in relationships"],
    [36.08, "But we still fuck and we hate this shit"],
    [38.63, "We still numb but we faking it"],
    [40.86, "Bet you're laid up on your new man's chest"],
    [43.23, "You can't feel shit 'cause you're too depressed but"],
    [45.50, "It is what it is I guess"],
    [47.31, ""],
    [46.48, "Right now, I'm laying in bed with nobody to love"],
    [49.36, "And my ex is probably out having fun, hooking up"],
    [51.60, "With the person that she told me not to worry about"],
    [53.85, "But it's alright 'cause we're both numb"],
    [56.02, ""],
    [56.21, "Right now, still feeling lonely as fuck"],
    [58.54, "I don't even have the energy to try to get up"],
    [60.82, "Shoulda never had a girl I gotta worry about"],
    [63.07, "But it's just life when there's no love"],
    [65.53, ""],
    [66.00, "And there's no time"],
    [68.22, "Why should I waste my life on you?"],
    [70.56, "When you think he's more your type, you must be out your mind"],
    [74.74, "I tried smoking, losing track of the night"],
    [76.81, "But this time, I just can't control it"],
    [79.28, "Daylight come before I'm closing my eyes"],
    [81.50, "I can't sleep when I feel so broken"],
    [83.89, "I like to pretend that it's not what it seems, but"],
    [88.37, "Every time I wake up I see her in my dreams"],
    [92.44, ""],
    [92.45, "Right now, I'm laying in bed with nobody to love"],
    [95.48, "And my ex is probably out having fun, hooking up"],
    [97.80, "With the person that she told me not to worry about"],
    [99.96, "But it's alright 'cause we're both numb"],
    [102.31, ""],
    [102.32, "Right now, still feeling lonely as fuck"],
    [104.64, "I don't even have the energy to try to get up"],
    [107.00, "Shoulda never had a girl I gotta worry about"],
    [109.14, "But it's just life when there's no love"]
  ],

  "i-wont-beg-for-you-christian-gates": [
    [10.44, "I'd rather cut ties and take the loss"],
    [14.08, "Even though I just paid it off"],
    [17.43, "Couldn't smell the fire burning down"],
    [20.62, "Even though I tried to pull you out"],
    [24.54, "Blame"],
    [26.80, "Bruises and chains"],
    [29.78, "I'll say your name"],
    [32.97, "I'll say your name"],
    [36.02, "But I won't beg for you my dear"],
    [39.13, "These knees have bled, pulled out my hair"],
    [42.32, "Didn't know you tried to burn us down"],
    [45.41, "Even when we tried to work it out"],
    [48.59, "But I won't beg for you my dear"],
    [51.21, "These knees have bled, pulled out my hair"],
    [54.83, "Didn't know you tried to burn us down"],
    [57.97, "Even when we tried to work it out"],
    [61.95, "Lord knows I've been to hell and back"],
    [65.42, "I've met the devil and knew worse than that"],
    [68.52, "You'd end the world before you save me"],
    [71.48, "You'd hang your self before you take the"],
    [74.29, "Blame"],
    [76.41, "Bruises and chains"],
    [79.23, "I'll say your name"],
    [82.36, "I'll say your name"],
    [85.56, "But I won't beg for you my dear"],
    [88.69, "These knees have bled pulled out my hair"],
    [91.92, "Didn't know you tried to burn us down"],
    [94.98, "Even when we tried to work it out"],
    [98.08, "But I won't beg for you my dear"],
    [100.96, "These knees have bled pulled out my hair"],
    [104.43, "Didn't know you tried to burn us down"],
    [107.43, "Even when we tried to work it out"]
  ],

  "dangerous-state-of-mind-christian-gates": [
    [0.01, "You say we're better as friends"],
    [1.92, "Like I could live and forget"],
    [3.04, "You got so good at pretending you're sorry"],
    [6.33, "From someone that I love"],
    [7.51, "To someone I see hardly"],
    [9.29, "Someone I used to fuck"],
    [10.72, "To someone that won't call me"],
    [12.98, "You let me go 'cause of misunderstandings"],
    [16.06, "Now that I know you better, I get what your plan is"],
    [19.16, "Damage, gas lit"],
    [20.72, "You're driving me batshit"],
    [22.31, "Wanna see me crazy?"],
    [23.58, "Well, maybe I'll let you have it"],
    [25.04, "'Cause"],
    [26.39, "You don't give a fuck right now"],
    [28.78, "Know you're in my head keeping me up right now"],
    [32.34, "I'd be fucking you rough right now"],
    [34.09, "But someone's in your bed keeping you up right now"],
    [39.45, "You stand behind your walls"],
    [42.91, "You don't know me at all"],
    [45.97, "You stay just out of reach"],
    [49.12, "Just so you can take advantage of me"],
    [50.95, "If I let you get to me"],
    [52.78, "That would be the death of me"],
    [54.26, "You should know you're dead to me"],
    [55.55, "Murderer of my memories"],
    [57.05, "Tryna get ahead of me"],
    [59.00, "'Til you giving head to me"],
    [60.59, "Draining all my energy"],
    [62.15, "Lovers turn into to enemies"],
    [64.31, "You let me go 'cause of misunderstandings"],
    [67.36, "Now that I know you better, I get what your plan is"],
    [70.33, "Damage, gas lit"],
    [71.97, "You're driving me batshit"],
    [73.36, "Wanna see me crazy?"],
    [74.81, "Well, maybe I'll let you have it"],
    [76.34, "'Cause"],
    [77.54, "You don't give a fuck right now"],
    [79.95, "Know you're in my head keeping me up right now"],
    [83.76, "I'd be fucking you rough right now"],
    [86.16, "But someone's in your bed keeping you up right now"],
    [90.64, "You stand behind your walls"],
    [93.83, "You don't know me at all"],
    [97.20, "You stay just out of reach"],
    [100.30, "Just so you can take advantage of me"],
    [103.18, "You don't give a fuck right now"],
    [105.45, "Know you're in my head keeping me up right now"],
    [109.31, "I'd be fucking you rough right now"],
    [111.65, "But someone's in your bed keeping you up right now"]
  ],

  "arson-christian-gates": [
    [5.10, "Smoke is in the air"],
    [9.50, "I wasn't into arson but look at what you started"],
    [12.57, "Don't pretend you're scared"],
    [15.47, "If I start being honest will you stop being heartless"],
    [19.33, "I'm so sorry I burnt your house down"],
    [22.54, "That wasn't very thoughtful of me"],
    [25.25, "I should stick to writing songs and not messing with lighters"],
    [27.62, "I guess my momma never taught me not to play with fire"],
    [31.28, "So if you wanna burn me"],
    [32.78, "I'll burn you"],
    [34.80, "If you're gonna hurt me"],
    [36.04, "I'll hurt you"],
    [37.70, "If you turn up the heat"],
    [39.17, "I'll turn it up higher"],
    [40.96, "Someone should've taught you not to play with fire"],
    [44.98, "You act so innocent but you're holding a match"],
    [48.18, "And I got a container of gas"],
    [50.33, "If you let that thing go this place is gonna blow"],
    [53.60, "But that's okay with me as long as you're caught in the smoke"],
    [58.04, "Smoke is in the air"],
    [60.91, "I wasn't into arson but look at what you started"],
    [64.22, "Don't pretend you're scared"],
    [67.33, "If I start being honest will you stop being heartless"],
    [71.65, "I'm so sorry I burnt your house down"],
    [74.34, "That wasn't very thoughtful of me"],
    [76.51, "I should stick to writing songs and not messing with lighters"],
    [79.67, "I guess my momma never taught me not to play with fire"],
    [82.98, "So if you wanna burn me"],
    [84.96, "I'll burn you"],
    [86.50, "If you're gonna hurt me"],
    [88.57, "I'll hurt you"],
    [89.46, "If you turn up the heat"],
    [91.38, "I'll turn it up higher"],
    [92.94, "Someone should've taught you not to play with fire"],
    [96.53, "We got the whole block in flames"],
    [98.32, "Calling up the SWAT team"],
    [99.89, "Used to say that I'm insane but look at where you got me"],
    [103.77, "We're cranking this oven till it's hot like the sun"],
    [105.84, "To Fahrenheit 451"],
    [108.76, "So if you wanna burn me"],
    [111.75, "I'll burn you"],
    [112.44, "So if you're gonna hurt me"],
    [113.41, "I'll hurt you"],
    [115.46, "If you turn up the heat"],
    [116.51, "I'll turn it up higher"],
    [119.48, "Someone should've taught you not to play with fire"],
    [121.93, "So if you wanna burn me"],
    [124.49, "I'll burn you"],
    [125.31, "If you're gonna hurt me"],
    [127.14, "I'll hurt you"],
    [128.33, "If you turn up the heat"],
    [129.71, "I'll turn it up higher"],
    [131.97, "Someone should've taught you not to play with fire"]
  ],

  "when-i-wake-up-christian-gates": [
    [3.64, "How come I always seem to think of you at this time of night?"],
    [6.99, "And 'bout your daddy, man, I hope he's not out still getting high"],
    [10.43, "I'm asking 'round about the Bible, wasn't easy but I"],
    [13.81, "Convinced myself you're somewhere better, God, I hope that I'm right"],
    [17.19, "I met my lover at the bar, it's like I looked in your eyes"],
    [20.74, "My phone was ringing had a feeling in the back of my mind"],
    [24.12, "He broke the news, I kept my cool but I was shaking inside"],
    [27.56, "We used to wonder what came after love, I hope you're alright"],
    [32.94, "I hope you're alright"],
    [37.25, "When I dream I see your face"],
    [40.51, "But you just don't look the same"],
    [44.01, "And I know you'll start to fade when I wake up"],
    [54.90, "We were just kids when Alex snitched, I told the cops it was mine"],
    [58.35, "You're moving faster, skipping classes, but you swore you were fine"],
    [61.81, "You met my dad tripping on acid that was crossing the line"],
    [65.33, "But I didn't think you had a problem, it took over your life"],
    [68.71, "Sometimes I wonder if the thought was ever crossing your mind"],
    [72.08, "I'd hate to think that I'm a reason you didn't make it that night"],
    [75.47, "I wish I'd known how this could go, I kept ignoring the signs"],
    [79.00, "They say you'll end up somewhere better, love, I hope you're alright"],
    [81.18, "I hope you're alright"],
    [88.66, "When I dream I see your face"],
    [91.99, "But you just don't look the same and I know you'll start to fade when I wake up"],
    [102.37, "When I dream I see your face"],
    [105.77, "But you just don't look the same and I know you'll start to fade when I wake up"],
    [115.47, "When I wake up"],
    [118.73, "When I wake up"],
    [122.25, "When I wake up"],
    [137.14, "You keep saying all the right things"],
    [140.03, "So we end up in all the wrong places"],
    [143.99, "Told me you would always be safe but"],
    [147.31, "I don't know where you are right now"],
    [150.69, "You keep saying all the right things"],
    [153.74, "So we end up in all the wrong places"],
    [157.56, "Told me you would always be safe but"],
    [160.94, "I don't know where you are right now"],
    [164.16, "And I'm too young to be this stressed out"],
    [167.75, "Yeah, I'm too young to be this stressed out"],
    [170.99, "I'm too young to be this stressed out"],
    [174.45, "I'm too young"],
    [177.81, "When I dream I see your face"],
    [181.29, "But you just don't look the same and I know you'll start to fade when I wake up"],
    [191.53, "When I dream I see your face"],
    [194.81, "But you just don't look the same and I know you'll start to fade when I wake up"],
    [204.61, "When I wake up"],
    [207.84, "When I wake up"],
    [207.90, "When I wake up"]
  ],

  "overwhelmed-christian-gates-remix": [
    [10.91, "I get overwhelmed so easily"],
    [13.72, "My anxiety creeps inside of me"],
    [16.41, "Makes it hard to breathe"],
    [17.85, "What's come over me?"],
    [19.23, "Feels like I'm somebody else"],
    [21.54, "So just don't get overwhelmed"],
    [23.77, "Then you'll make it out, then you'll be just fine"],
    [26.42, "I promise you don't have to worry 'bout a thing"],
    [29.13, "Don't let it break you down, you got me by your side"],
    [32.19, "And when you feel the difference, it'll be night and day"],
    [36.51, "Night and day"],
    [39.87, "Fuck what they think"],
    [41.11, "I'll tell you you're fine"],
    [42.67, "When you're with me, I ain't letting that slide"],
    [45.48, "Fuck what they say"],
    [46.62, "They're no friend of mine"],
    [48.17, "If they keep coming, I ain't letting one by"],
    [52.63, "That's the way it goes"],
    [54.21, "If they ever try to touch you, then just stay at home"],
    [58.16, "That's the way it ends"],
    [59.77, "I'll make sure they never see another day again"],
    [62.44, "These things take time"],
    [63.54, "Don't let 'em get to your head"],
    [64.96, "You let 'em into your mind"],
    [66.51, "Now they're under your bed"],
    [67.70, "They come in easy"],
    [69.25, "But it's harder to get them out"],
    [71.35, "So just don't get overwhelmed"],
    [72.69, "My mind isn't mine"],
    [75.43, "Who am I to judge?"],
    [78.21, "Oh, I should be fine"],
    [80.99, "But it's all too much"],
    [82.71, ""],
    [82.71, "I get overwhelmed"],
    [84.16, "I should be fine"],
    [86.48, "But it's all too much"],
    [89.59, "I should be fine"],
    [92.01, "But I'm not"],
    [92.93, ""],
    [93.65, "I get overwhelmed"],
    [104.71, "I get overwhelmed"],
    [106.78, ""],
    [106.78, "Don't take me now"],
    [109.66, "I'm not ready to forget"],
    [112.35, "Don't cut me out"],
    [115.03, "Pray my life's not soon to end"],
    [117.93, "Don't take me now"],
    [120.67, "I'm not ready to forget"],
    [123.37, "Don't cut me out"]
  ],

  "sienna-you-stole-the-show": [
    [18.36, "You stole the show, got a standing ovation"],
    [26.33, "I lost control from the stage, from your face, and"],
    [34.15, "You don't say hello, I can't wait, I'm impatient"],
    [42.62, "Yeah, you stole my show, so I chase you to the pavement"],
    [50.67, "Wrap me in your arms again"],
    [53.67, "The adrenaline makes me shiver"],
    [58.38, "Show me that you're genuine"],
    [61.63, "That I'm safe again"],
    [63.84, "That you came here different"],
    [66.50, "No time to define but before we get closer"],
    [74.31, "I ask if you love me and you just shrug your shoulders"],
    [90.82, "You stole the show, now the crowds coming through, I just sink into you"],
    [98.95, "Just blowing smoke 'cause this moment will end"],
    [103.75, "I'll be back at the scene you left cold"],
    [106.59, "My love turns green, and oh, you made me hate myself, mmm"],
    [114.75, "You stole it all, so I wait just to save this"],
    [122.38, "Wrap me in your arms again"],
    [125.32, "The adrenaline makes me shiver"],
    [130.03, "Show me that you're genuine"],
    [133.19, "That I'm safe again"],
    [135.39, "That you came here different"],
    [138.21, "No time to define but before we get closer"],
    [146.28, "I ask if you love me and you just, won't you just"],
    [154.41, "Wrap me in your arms again"],
    [157.50, "The adrenaline makes me shiver"],
    [162.22, "Show me that you're genuine"],
    [165.43, "That I'm safe again"],
    [167.64, "That you came here different"],
    [170.64, "No time to define but before we get closer"],
    [179.80, "I ask if you love me and you just shrug your shoulders"]
  ],
  "alexandra-burke-hallelujah": [
    [7.65, "I heard there was a secret chord"],
    [11.59, "That David played, and it pleased the Lord"],
    [16.09, "But you don't really care for music, do ya?"],
    [23.34, "Well, it goes like this, the fourth, the fifth"],
    [27.49, "The minor fall and the major lift"],
    [31.34, "The baffled king composing Hallelujah"],
    [38.57, "Hallelujah, Hallelujah"],
    [46.59, "Hallelujah, Hallelujah"],
    [62.94, "Your faith was strong, but you needed proof"],
    [66.94, "You saw her bathing on the roof"],
    [70.94, "Her beauty and the moonlight overthrew ya"],
    [78.69, "She tied you to her kitchen chair"],
    [82.69, "She broke your throne and she cut your hair"],
    [86.59, "And from your lips, she drew the Hallelujah"],
    [93.29, "Hallelujah, Hallelujah"],
    [101.56, "Hallelujah, Hallelujah"],
    [127.14, "Maybe there's a God above"],
    [130.89, "But all I've ever learned from love"],
    [134.94, "Was how to shoot somebody who outdrew ya"],
    [142.74, "It's not a cry that you hear at night"],
    [146.66, "It's not someone who's seen the light"],
    [150.66, "It's a cold and it's a broken Hallelujah"],
    [158.00, "Hallelujah, Hallelujah"],
    [165.87, "Hallelu'"],
    [173.79, "Hallelujah, Hallelujah"],
    [181.79, "Hallelujah, Hallelujah"],
    [197.44, "Hallelujah, Hallelujah"],
    [209.09, "Hallelujah, Hallelujah"],
  ],
  "thiago-silva-dave-aj-tracey": [
    [26.34, "Santan from the v-v x AJ"],
    [28.29, "Man mystic with the pen like J.K"],
    [30.04, "True say, I ain’t really a drinker"],
    [31.41, "But I got love for brandy like Ray J"],
    [33.29, "Champagne popper, .44 chopper"],
    [34.45, "In the black Nike bomber, heartbeat stopper"],
    [36.52, "Half-heart MC dropper"],
    [37.72, "45 wapper, leave you in states like Kaká"],
    [39.64, "AJ from the l-l x Santan"],
    [41.58, "Man’s got style on the riddim like Gangnam"],
    [43.24, "Two young bruddas tryna eat off of music"],
    [44.68, "But we used to eat off of pebs and the sand bags"],
    [46.44, "Now we get money, music money"],
    [48.04, "Money that could put your girlfriend in a handbag"],
    [49.69, "White tee, Balenciagas, man bag"],
    [51.39, "Left-winger with a long stick like a granddad"],
    [53.05, "AJ Tizzy from T-H-E lizzy"],
    [54.74, "And I’m all out for the Lizzy"],
    [56.41, "I don’t wanna look like you, you’re broke"],
    [58.03, "And I’ve been telling broke bruddas move like Grizzy"],
    [59.76, "Still brandy but the hand ting fizzy"],
    [61.25, "Probs be in bin if a man weren’t busy"],
    [63.05, "I’m a mic king, I’m a king on the mic"],
    [64.50, "And I’ll spin bruddas till the whole scene gets dizzy"],
    [66.46, "Walk in the rave, smile on my face"],
    [68.50, "Drink in my cup, hand in my jeans"],
    [70.19, "Man talk tough, man look up, down, left, right"],
    [71.96, "Straight to a bang in the teeth"],
    [73.38, "Man still talk tough, man saw man in the flesh"],
    [75.57, "Now man’s tryna talk to my Gs"],
    [76.73, "Nah, none of that, none, .45 drum"],
    [78.22, "Run you right out of your street"],
    [79.97, "Walk in the dance, chicks wanna glance"],
    [81.76, "Hand on my hip, shank for the dip"],
    [83.34, "If I shout “Oi”, them man there best skip"],
    [84.86, "Better tie up your laces tight and don’t trip"],
    [86.51, "Trip, get splashed"],
    [87.56, "Couldn’t care less about my man’s gang"],
    [89.18, "We’re not fam, we’re not friends or bredrins"],
    [91.16, "You’ll get tanned and binned, cock, then blam"],
    [93.35, "Santan Dave from the Vale and Tracey"],
    [94.73, "Duck man down on the road, I’m pacey"],
    [96.74, "Two lighties on the phone, so facety"],
    [97.80, "One named Jordan and one named Stacey"],
    [99.58, "S with the S from the S, ask Showkey"],
    [101.14, "Dust man down with a mask like Tobi"],
    [102.79, "Tell a boy cotch, my man’s telling me lots"],
    [104.63, "But we are not Gs so don’t watch my face"],
    [106.58, "Ladbroke Grove is where I re- who?"],
    [108.41, "Man get burst up in the G- who?"],
    [110.06, "Came back with a fresh one, it’s new"],
    [111.65, "Don’t come around for a two with a blue"],
    [113.36, "I don’t give a fuck if you’re old or new"],
    [115.02, "I’ll just go on like Blackpool who?"],
    [116.65, "Put a couple dead MCs in the grave"],
    [118.33, "Trust me, darg, you can go there too"],
    [120.12, "Trust me, darg, you can go there free"],
    [121.74, "I’ll never watch F-A-C-E"],
    [123.20, "AJT from MTP"],
    [124.90, "Nike lab tracksuit, Nike ID"],
    [126.41, "Man got overly fucked in the beef"],
    [128.12, "Pretty sure I landed a bang to his teeth"],
    [129.83, "Man will get banged in the face by me"],
    [131.49, "Not my bredrin, banged in the face by me"],
    [133.19, "And me"],
    [134.37, "Man talk tough, we’ll see"],
    [135.75, "Hit him with the left, right, left, right, left, right, right"],
    [137.61, "One jab, then I duck, then weave"],
    [139.03, "Come like Trevor from GTA"],
    [140.64, "If I bang man’s face, man bop, then lean"],
    [142.16, "Kun Aguero, man dropped the shoulder feint once"],
    [144.09, "Quick kick then I drop man’s G"],
    [145.78, "First time I link her, Nandos sweet"],
    [147.20, "£9.95, I swipe, then eat"],
    [148.99, "I one-two rap, she don’t give hat"],
    [150.67, "Thiago Silva, man block, then skeet"],
    [152.24, "Had man screaming “Look, there’s my man”"],
    [154.20, "Hand in my pouch like “Where? It’s not me”"],
    [155.69, "Hand in my pouch like “Where? It’s not us”"],
    [157.23, "Turned to my G like “Where? It’s not we”"],
    [158.90, "So if you get boom with the .45 long"],
    [160.47, "It’s a critical hit, no chance to repeat"],
    [162.19, "And if you see Arge in the cut with the dip"],
    [163.97, "You’re pissed so quick your team should retreat"],
    [165.49, "But if you see Juss in the cut with his right hand tucked"],
    [167.54, "You’re fucked, your team should leave, G"],
    [168.90, "If you see Rapz in the back with his hand in the bag"],
    [170.81, "It’s mad, we came to see Ps"],
    [172.49, "Walk in the rave, smile on my face"],
    [174.81, "Drink in my cup, hand in my jeans"],
    [176.32, "Man talk tough, man look up, down, left, right"],
    [178.80, "Straight to a bang in the teeth"],
    [179.63, "Man still talk tough, man saw man in the flesh"],
    [181.85, "Now man’s tryna talk to my Gs"],
    [183.00, "Nah, none of that, none, .45 drum"],
    [184.22, "Run you right out of your street"],
    [186.32, "Walk in the dance, chicks wanna glance"],
    [188.45, "Hand on my hip, shank for the dip"],
    [189.72, "If I shout “oi, them man there best skip”"],
    [191.26, "Better tie up your laces tight and don’t trip"],
    [192.80, "Trip, get splashed"],
    [193.89, "Couldn’t care less about my man’s gang"],
    [195.45, "We’re not fam, we’re not friends or bredrins"],
    [197.38, "You’ll get tanned and binned, cock, then blam"],
  ],
  "clash-dave-stormzy": [
    [12.35, "Jordan 4's or Jordan 1's"],[14.23, "Rolexes, got more than one"],[15.85, "My AP cost thirty-one"],[17.65, "Millimeters forty-one"],[19.30, "Stick him up with a stick, stick"],[21.45, "He drew the shorter one"],[23.14, "You can't short me one"],[24.37, "In the club with the shortest one"],[26.07, "Lighty, the shortest one"],[27.74, "On my mind, Jorja one"],[29.52, "Crocodile bag, I bought her one"],[31.16, "Vegan ting, I slaughter one"],[33.05, "Freaks, I got more than one"],[34.61, "Fuck, daddy and daughter one"],[36.79, "Tory putting in labour, this that Jeremy Corbyn one"],[39.77, "Awkward one"],[40.57, "Race me there, wait, hare, tortoise one"],[43.23, "I need a ting, thirty plus"],[45.08, "Blackberry and Walkman 1's"],[46.65, "Look, I left my phone at my baby's, silent mode"],[50.10, "My guy's on riding mode"],[51.85, "Zombie survival mode"],[54.09, "He's got a new vest? Man, pop that shield, no microphone"],[57.62, "I'll ride for bro"],[58.57, "He's next to I like typing \"O\""],[60.51, "The score, 5 and 0"],[62.93, "6 to 1"],[64.31, "For the kicks I love, 12:54 like 6 to 1"],[67.41, "Bae, can't look in my mentions, that's Area 51"],[70.72, "I'm so close to my pension, my left wrist is sixty-one"],[74.50, "My left wrist retiring"],[77.68, "My apprentice tryna give Alan Sugar"],[79.64, "There's no way I can-"],[80.95, "Jordan 4's or Jordan 1's"],[82.62, "Rolexes, got more than one"],[84.32, "My AP cost thirty-one"],[86.20, "Millimeters forty-one"],[87.90, "Stick him up with the stick, stick"],[89.83, "He drew the shorter one"],[91.74, "You can't short me one"],[92.92, "In the club with the shortest one"],[94.72, "Lighty, the shortest one"],[96.33, "On my mind, Jorja one"],[98.05, "Crocodile bag, I bought her one"],[99.72, "Vegan ting, I slaughter one"],[101.44, "Freaks, I got more than one"],[103.14, "Fuck, daddy and daughter one"],[105.33, "Tory putting in labour, this that Jeremy Corbyn one"],[108.91, "Overrated one, most hated one"],[112.18, "Slid 'round after his birthday, gave him a happy belated one"],[115.26, "Burned that bridge, cremated one"],[117.06, "Ooh, ooh, bailiff one"],[119.34, "Got away with murder, this that Viola Davis one"],[122.04, "They stop and stare, watch rare"],[123.84, "Uh, clear, stainless one"],[126.26, "Debate this one"],[127.45, "Hating **** gonna hate this one"],[129.62, "I, I live life on the high, might fly to Dubai with the guys"],[132.23, "'Cause the weather's been shit"],[133.17, "I can wear a different kettle every day of the month"],[135.18, "I'm a different-"],[135.89, "Rollies, got twenty-one"],[137.61, "I been lit since twenty-one"],[139.40, "Girl, I need that gently one"],[141.12, "That Savage and Fenty one"],[142.53, "Hmm, Dave's got the new Aston Martin plug, could you send me one?"],[145.91, "He said, \"No need to be renting one\""],[148.02, "Big flexes, inventin' one"],[150.25, "My bros don't chat, we just wear all black"],[151.94, "On a blend-in one"],[153.48, "Man are talking war, don't know bout war"],[155.32, "Till you end in one"],[156.21, "The machine got sweets, on a vending one"],[159.61, "Needed a hit, could've penned him one"],[162.10, "'Cause you're pending one"],[163.47, "Ah, she wanna go to the cinema, so we just walk downstairs"],[167.42, "The mortgage cleared, we've overtaken all our peers"],[170.71, "After all these years, disrespect is all I hear"],[173.66, "I'm Pep, I ball with flair"],[175.26, "Off they set they storm like"],[177.04, "Off the set they storm like Piers"],[180.17, "That's what I call morning tears"],[182.01, "Them man are talking bare, but it's cool 'cause-"],[183.73, "I got my ting, so I'm more than good"],[185.48, "Anytime that I walk my hood"],[187.18, "I got the Jordan 4's and 6's"],[188.99, "All I need now is Jordyn Woods"],[191.02, "Don't get caught for pus', don't die for nyash"],[194.64, "We slide and crash"],[196.02, "Sixteen don't write and clash"],[197.57, "Sixteen don't battle rap"],[199.18, "She got the WAP and a wap"],[200.94, "What are you thinking? Man's on simping"],[202.54, "I buy her a car like a pair of-"],[204.41, "Jordan 4's or Jordan 1's"],[206.08, "Rolexes, got more than one"],[207.85, "My AP cost thirty-one"],[209.51, "Millimeters forty-one"],[211.32, "Stick him up with the stick, stick"],[213.31, "He drew the shorter one"],[215.11, "You can't short me one"],[216.41, "In the club with the shortest one"],[218.08, "Lighty, the shortest one"],[219.81, "On my mind, Jorja one"],[221.44, "Crocodile bag, I bought her one"],[223.21, "Vegan ting, I slaughter one"],[224.91, "Freaks, I got more than one"],[226.59, "Fuck, daddy and daughter one"],[228.82, "Tory putting in labour, this that Jeremy Corbyn one"]
  ],
  "let-me-in-oneda": [
    [15.53,"I ain't messing no more, this is serious play"],[18.29,"Like school kids playing chess on their break"],[20.41,"No more stop starting like I'm testing the breaks, I move quick"],[23.07,"Like their coming for me I'm running with Pace, no card game"],[26.54,"I'm so far ahead, I will leave them chasing the ace"],[28.79,"Sky's the limit, I ain't stopping till I'm living in space"],[31.78,"And they won't believe me tlll they see me packing my case"],[34.21,"Smile on my face like, oh well, I'll leave them yapping away"],[37.15,"Yap, yap, mutts, I'm pedigree, no chum of mine"],[39.96,"They're hating but when they hear my flows, they're humming lines"],[42.71,"I Jäger bomb 'em, they're just lager and lime"],[45.13,"So a few shots of me leave 'em on the floor everytime"],[47.81,"'Cause I stun 'em, stun gun 'em, keep the hits coming"],[50.48,"'Cause my B game is their A game, now that stunning"],[53.13,"Hundred percent, they 5-0 like handcuffing"],[55.85,"If I see Popo, I ain't running, nah"],[58.55,""],
    [58.55,"If I making noise, let me in"],[61.19,"On a wave front crawl, let me swim"],[63.90,"If I park outside, let me in"],[66.52,"Let me in babes, let me in"],[69.24,"If I making noise, let me in"],[71.91,"On a wave front crawl, let me swim"],[74.56,"If I park outside, let me in"],[77.20,"Let me in babes, let me in"],[79.61,"Now"],[80.31,""],
    [81.99,"Check, see I ain't messing no more, this is serious play"],[85.44,"Okay, scrap play, I want serious pay"],[88.06,"Okay, scrap pay, I want my life to be straight"],[90.81,"They don't let me in, I'm kicking down six foot barricades"],[93.42,"I drop bombs, them bite size like grenades"],[96.16,"I'm too hot, they give me shade (Give me shade)"],[98.11,"Attitude, sour like lemons, make lemonade"],[100.53,"The crowd, they serenade, my voice, it emanates"],[103.18,"Baby, close your eyes when I'm spitting, make you levitate"],[106.10,"'Cause I'm deeper than the Red Sea and as bloody as the name"],[109.01,"In a plain hoody and a chain, hammering the pain, fuck shine, gimme rain"],[112.99,"Hallowed be his name, sinner, all the same"],[114.86,"Gotta let me in, you see, a monarch gotta reign"],[117.64,"Umbrella up, believe I'm taking all the blame"],[120.29,"They didn't see me when I left"],[121.88,"But a buss loads explode"],[123.56,"So, believe me man, they felt it, when I came"],[125.60,""],
    [125.60,"If I making noise, let me in"],[128.26,"On a wave front crawl, let me swim"],[130.95,"If I park outside, let me in"],[133.53,"Let me in babes, let me in"],[136.24,"If I making noise, let me in"],[139.00,"On a wave front crawl, let me swim"],[141.64,"If I park outside, let me in"],[144.23,"Let me in babes, let me in"],[146.72,"Now"],[147.09,""],
    [147.09,"If I making noise, let me in"],[155.09,"On a wave front crawl, let me swim"],[157.76,"If I park outside, let me in"],[160.27,"Let me in babes, let me in"],[163.12,"If I making noise, let me in"],[165.76,"On a wave front crawl, let me swim"],[168.42,"If I park outside, let me in"],[171.01,"Let me in babes, let me in"],[173.48,"Now"]
  ],
  "bad-oneda": [[0, "You caught us, we're still working on getting lyrics for this one."]],
  "set-it-off-oneda": [[0, "You caught us, we're still working on getting lyrics for this one."]],
};

LYRICS["balling-vibe-chemistry"] = [[0.25,"I just bought a coupe"],[1.63,"Just to flex on you"],[3.0,"'Rari, 'Rari shoe"],[4.18,"Cause I'm mad for you"],[5.55,"I just sold 'em, too"],[7.03,"Bitch, I never do"],[8.34,"Freezer freezer, too"],[9.71,"Cause I flex for you"],[11.05,"I just bought a coupe"],[12.46,"Just to flex on you"],[13.94,"'Rari, 'Rari shoe"],[15.23,"Cause I'm mad for you"],[16.6,"I just sold 'em, too"],[18.0,"Bitch, I never do"],[19.38,"Freezer freezer, too"],[20.73,"Cause I flex for you"],[22.17,"Whip it up, all these rocks on my wrist (Wrist)"],[25.13,"Bring it back up, up, cause it's lit (Lit, lit)"],[27.93,"Keep it cool, ice cold for this shit (Shit, shit)"],[30.69,"Cause I'm ballin', look at all these chicks (Chicks)"],[33.27,"Whip it up, all these rocks on my wrist (Wrist)"],[36.09,"Bring it back up, up, cause it's lit (Baow, baow)"],[38.98,"Keep it cool, ice cold for this shit (Vibe Chemistry)"],[41.49,"Cause I'm ballin', look at all these chicks (Chicks)"],[44.59,"I just wanna go pub on a Friday"],[46.02,"Without one of us getting in someone's face"],[47.51,"Some randomers blood just splat on my Air Force"],[49.22,"Looking like custom mades"],[50.47,"My boy's got an 8 ball wrapped in his balls"],[52.03,"I tell him to adjust his waist"],[53.09,"The bouncers told us in the back of the 'ham"],[54.46,"That we've gotta be careful"],[55.02,"Just in case, it's way too long"],[56.49,"Still be caught with the way it's goin' (Trust)"],[58.06,"I don't care if you hate this song"],[59.24,"Man, it ain't my fault you were raised up wrong"],[60.63,"Sometimes I play you somethin' grime"],[62.08,"Or sometimes I play hits in a bog"],[63.42,"I don't wanna hear no shit out your mouth"],[64.84,"And it ain't my fault that you're drifting along"],[66.22,"Bitch, I'm a don and my missus a baddie, the scent on my neck is just Issey Miyake"],[68.89,"The flow is illegal and evil and I'ma get nicked like I'm pinches of baccy"],[71.31,"I'm keeping a tally of all you bitches that wanna get aggy"],[73.39,"You're soundin' all bitter, I wish you were happy"],[74.84,"I'm Iniesta and Xavi, I'll spin him an book him a cabby, yeah"],[77.25,"Had a long day want one, two joints"],[78.61,"Picking up girls, don't drop two coins"],[79.96000000000001,"When I do tour, man, better make noise"],[81.31,"Silence hurts, I got this voice"],[82.82,"Analyze my life, made that make sense"],[84.32,"Monetize my mind made that make pence"],[85.76,"When I write, put a spike in the mighty"],[86.98,"Friends wanna cop free five on a fight, it's tense"],[88.43,"I'm stacking dough from rapping, bro, you know I'm always balling"],[91.24,"These other rappers sounding shit, you know they sound appalling"],[94.07,"I cannot listen to their music 'cause it's very boring"],[96.64,"And when it comes to talking truths, you know I'm going all in"],[99.37,"I'm investing all my money, I'm investing all my powers"],[102.97999999999999,"I work a lot, that's why I meditate for hours (Omm)"],[105.82,"I'm in the sauna then the ice cold showers"],[108.4,"Then I'm tripping out on psychedelic flowers"],[110.91,"I'm tripping (Tripping)"],[112.05,"But I ain't resting all the time"],[113.47,"I'm working 24/7, I'm investing all my mind (All my mind)"],[116.50999999999999,"I'm clever, I'm investing in some lands"],[118.53,"I don't care, I'm not interested in the brands"],[121.11,"I'm interested in the world, I'm interested in my health (Oh yes)"],[124.07,"This money that I'm stacking's generational wealth (Cha-ching)"],[127.24,"I come from nothing and I did it by myself"],[129.4,"I'm self made, I ain't never ever had no help"],[132.52,"I just bought a coupe"],[133.92,"Just to flex on you"],[135.27,"'Rari, 'Rari shoe"],[136.65,"Cause I'm mad for you"],[137.93,"I just sold 'em, too"],[139.32999999999998,"Bitch, I never do"],[140.79,"Freezer freezer, too"],[142.07,"Cause I flex for you"],[143.52,"I just bought a coupe"],[144.95,"Just to flex on you"],[146.32999999999998,"'Rari, 'Rari shoe"],[147.74,"Cause I'm mad for you"],[149.07,"I just sold 'em, too"],[150.39,"Bitch, I never do"],[151.78,"All I wanna do is get in blind"],[154.6,"Whip it up, all these rocks on my wrist (Wrist)"],[157.51,"Bring it back up, up, cause it's lit (Lit, lit)"],[160.31,"Keep it cool, ice cold for this shit (Shit, shit)"],[163.07999999999998,"Cause I'm ballin', look at all these chicks (Chicks)"],[165.73,"Whip it up, all these rocks on my wrist (Wrist)"],[168.39,"Bring it back up, up, cause it's lit (Lit, lit)"],[171.37,"Keep it cool, ice cold for this shit (Shit, shit)"],[174.12,"Cause I'm ballin'"],[175.19,"You know what I mean, yeah"],[176.65,"I'm at the top of the league, I'm at the top of the game, I'm balling"],[179.65,"I like to keep it moving, continuous, I'm not stalling"],[182.05,"When I'm on drums and bass, I'm painting a picture like an expensive drawing"],[184.94,"That's why every weekend, I'm always around the country touring"],[187.65,"I get paid to rhyme that's why I shine, just like laminate flooring"],[190.49,"I'm always downloading information, like a program, installing"],[193.19,"I make money when I go to sleep and when I wake up in the morning"],[195.98,"I'm legendary like David Beckham, man of the match, I'm scoring"],[198.62,"I'm living my life with no regrets, I'm always ready to mash up the set (Yeah)"],[201.43,"All my life I've been smashing the mic, I make the DJ start breaking the decks"],[204.11,"It's all about what's going on now, I don't think about what's happening next"],[206.8,"I am a lyrical murderer (Wow), I'm on a balling flex"],[210.28,"I used to wear Valentino jeans and an Avirex"],[212.44,"Now I don't even care about designers, I'm still gonna look fresh to death"],[215.17000000000002,"I'm taking over everything till there ain't anything left"],[217.95,"I'm just gonna keep balling until I take my last breath"],[218.88,"Yo, Oneda, I'm like no other"],[221.13,"DNA from my mother"],[222.52,"DNA from my father"],[223.94,"I came up from the gutter"],[225.21,"Now we ain't have no bread, have no need for the butter"],[228.02,"Came up from poverty, only freebie was the water"],[230.82999999999998,"Now every word I utter"],[232.09,"Just flow like it be water"],[233.57999999999998,"Coming straight from the heart so every part is a shocker"],[236.32,"Every part's a big vibe, A/V bowel shocker"],[239.09,"Yes, every vowel shocking"],[240.39,"Magic, I'm Harry Potter"],[241.81,"See Oneda does it power"],[243.21,"Just ball, stand tall, try and stop her"],[245.37,"You for the Fed, either you a bitch or a copper"],[248.05,"To the beat, this shit had to go through the fire, type of cutter"],[250.83,"They tried, could never stop her, power, I've got a lotta"]];

LYRICS["eternity-alex-warren"] = [
  [0.54,"Hear the clock ticking on the wall"],[4.06,"Losing sleep, losing track of the tears I cry"],[7.61,"Every drop is a waterfall"],[10.99,"Every breath is a break in the riptide"],
  [14.48,"Oh, how long has it been? I don't know"],[19.16,"But it feels like an eternity"],[23.15,"Since I had you here with me"],[26.67,"Since I had to learn to be"],[30.12,"Someone you don't know"],[33.43,"To be with you in paradise"],[37.11,"What I wouldn't sacrifice"],[40.57,"Why'd you have to chase the light"],[44.01,"Somewhere I can't go?"],[47.09,"As I walk this world alone"],[54.09,"As I walk this world alone"],
  [63.49,"Another glimpse of what could've been"],[66.99,"Another dream, 'nother way that it never was"],[70.54,"Falling back in the wilderness"],[74.08,"Waking up, rubbing salt in the cut"],
  [77.52,"Oh, how long has it been? I don't know"],[81.96,"But it feels like an eternity"],[85.83,"Since I had you here with me"],[89.25,"Since I had to learn to be"],[92.68,"Someone you don't know"],[96.01,"To be with you in paradise"],[99.75,"What I wouldn't sacrifice"],[103.18,"Why'd you have to chase the light"],[106.66,"Somewhere I can't go?"],[109.71,"As I walk this world alone"],[116.69,"As I walk this world alone"],
  [125.39,"It's an endless night, it's a starless sky"],[128.91,"It's a hell that I call home"],[132.34,"It's a long goodbye on the other side"],[135.94,"Of the only life I know"],
  [141.34,"And it feels like an eternity"],[145.80,"Since I had you here with me"],[149.18,"Since I had to learn to be"],[152.65,"Someone you don't know"],[155.98,"To be with you in paradise"],[159.65,"What I wouldn't sacrifice"],[163.16,"Why'd you have to chase the light"],[166.53,"Somewhere I can't go?"],[169.63,"As I walk this world alone"],[176.63,"As I walk this world alone"]
];

LYRICS["location-dave-burna-boy"] = [
  [8.04,"JAE5"],[9.51,"If you send me the location"],[12.08,"Then I'll be right there"],[13.76,"And make I come check you, my baby"],[16.05,"No time, no"],[18.23,"And my dawg is on probation"],[20.85,"Another five years"],[22.47,"Mi bring girls to his location"],[24.73,"No time, no"],
  [26.78,"Send me the location"],[28.58,"This year about vacations"],[30.50,"Flight-catching, train-taking"],[32.79,"Soon as my **** off probation"],[35.01,"Your boyfriend's on a waiting ting"],[36.83,"Looking for one wish, on a Ray J ting"],[39.18,"I pree'd that girl, outrageous ting"],[41.25,"But she can't see 'cause I got shades and ting"],[43.67,"Bare girls wanna throw shade and ting"],[45.51,"No shade, what shade is your foundation in?"],[47.94,"Darkest grey, the shade I'm in"],[50.16,"Forty-nine more if your babes wants in"],[52.34,"Hmm, I had me a famous ting"],[54.49,"Goals and tings, gains and tings"],[56.70,"My house party a Babestation"],[58.91,"Girls wanna chase, it's a status ting"],
  [61.88,"If you send me the location"],[64.49,"Then I'll be right there"],[66.07,"And make I come check you, my baby"],[68.43,"No time, no"],[70.60,"And my dawg is on probation"],[73.16,"Another five years"],[74.85,"Mi bring girls to his location"],[77.12,"No time, no"],
  [80.01,"Look"],[81.06,"Playboy, I don't need a Carti"],[82.96,"I'm captain, I lead the army"],[84.86,"Bad ratio, I leave the party"],[87.20,"Three Somalis creeping on me"],[89.42,"Your ex wavey, we tsunami"],[91.60,"Girl from India, sweetest nani"],[93.90,"Head so good, now I speak Gujarati"],[95.83,"You? Hardly"],[96.61,"Pardon me, I'm laughing again"],[98.25,"I assisted, man passed to my friend"],[100.31,"Look, money like the alphabet"],[102.28,"If you wanna see Ps, gotta pass on the ends"],[104.68,"Came a long way from a park in the bends"],[106.63,"To an '18 plate, man's parking a Benz"],[109.11,"Far from the rest, but I'm far from my best"],[111.26,"Life is a lesson, I'm passing the test"],[113.43,"Yes, everyting blessed"],[115.09,"I don't want drama and I don't want stress"],[116.98,"My girl got finesse, Caribbean flex"],[119.41,"Body and chest, take buddy in chest"],[121.57,"Thank God more, I grew up with less"],[123.77,"Juss to the right, Rapz to the left"],[125.98,"Rj in the middle, got Cee to the death"],[128.14,"Batch fulla dogs, we're the '60s Vettes"],
  [131.66,"If you send me the location"],[134.31,"Then I'll be right there"],[135.95,"And make I come check you, my baby"],[138.27,"No time, no"],[140.44,"And my dawg is on probation"],[142.96,"Another five years"],[144.65,"Mi bring girls to his location"],
  [147.76,"****, I was down, but I made it to the top right now"],[152.26,"And I could pull a couple grand out my pocket right now"],[156.48,"Yeah, I'm so fly, yeah, I'm flyer than a rocket right now"],[161.05,"And all the games you play never stop right now"],
  [165.21,"I pull up on the block"],[167.42,"I see everybody watching"],[169.60,"'Cause there's diamonds on my chain"],[171.77,"And there's diamonds on my watch"],[173.91,"Money moves, Off-White shoes"],[176.12,"Came straight from Virgil Abloh"],[178.29,"I've been down, I've been low"],[180.42,"Had my mattress on the floor"],[183.51,"Call me up, nuff cap, belling up"],[185.79,"Gyal ah ring-ring my cellular"],[187.74,"Mi 'ave a big fat spliff bunning up"],[189.98,"Inna di big black Benz, pulling up"],[191.96,"Please tell everybody to start pulling up"],[194.17,"Nuff champagne from the bar coming up"],[196.35,"Party hard, make her live my life, oh"],
  [200.08,"****, I was down but I made it to the top right now"],[204.68,"And I could pull a couple grand out my pocket right now"],[208.82,"Yeah, I'm so fly, yeah, I'm flyer than a rocket right now"],[213.37,"And all the games you play never stop right now"],
  [218.92,"If you send me the location"],[221.56,"Then I'll be right there"],[223.19,"And make I come check you, my baby"],[225.48,"No time, no"],[227.69,"And my dawg is on probation"],[230.25,"Another five years"],[231.90,"Mi bring girls to his location"],[234.20,"No time, no"]
];

LYRICS["flowers-say-my-name-arrdee"] = [
  [6.19,"I don't give girls flowers"],[7.80,"I give you good wood though"],[9.30,"If you want me all for yourself"],[10.65,"Then, darlin', you probably should go"],[12.62,"There's no way I'ma stand in the rain"],[14.27,"I can still make you say my name"],[15.81,"Say my name, say my name"],[17.44,"Life without me might drive you insane"],
  [19.61,"I don't give girls flowers"],[21.38,"I give you good wood though"],[22.68,"If you want me all for yourself"],[24.06,"Then, darlin', you probably should go"],[26.01,"There's no way I'ma stand in the rain"],[27.76,"I can still make you say my name"],[29.21,"Say my name, say my name"],[30.91,"Life without me might drive you insane"],
  [32.65,"Nah, babe, I can't make your day"],[34.73,"But I can make your night"],[36.17,"See, I ain't the trusting type"],[37.79,"And it's lust, not love"],[38.74,"And she said, I'm done this time"],[40.23,"'Cause you make love to me like I'm the one"],[42.55,"Then run off and duck my calls for a month"],[44.28,"Make me feel special and then like a mug"],[45.80,"Got you up in my guts, but I hate your guts"],
  [47.68,"Aw, come back, darlin'"],[48.74,"Why you ranting?"],[49.42,"Girl, I'm single and I always have been"],[51.11,"I never promised you nothin' but panting"],[52.67,"Sweating and plans on a late night antic"],
  [54.45,"She said, you don't show me no respect"],[55.96,"And you're only calling me for the sex"],[57.74,"At least I call"],[58.49,"Cah the rest just all come crawling"],
  [60.02,"I don't give girls flowers"],[61.55,"I give you good wood though"],[63.08,"If you want me all for yourself"],[64.37,"Then, darlin', you probably should go"],[66.24,"There's no way I'ma stand in the rain"],[67.93,"I can still make you say my name"],[69.58,"Say my name, say my name"],[71.13,"Life without me might drive you insane"],
  [73.16,"I don't give girls flowers"],[75.10,"I give you good wood though"],[76.39,"If you want me all for yourself"],[77.81,"Then, darlin', you probably should go"],[79.75,"There's no way I'ma stand in the rain"],[81.36,"I can still make you say my name"],[82.95,"Say my name, say my name"],[84.56,"Life without me might drive you insane"],
  [87.10,"Might drive you crazy"],[88.14,"Psycho"],[88.96,"I'm wavy, so I'm texting typos"],[90.59,"But you know what I'm on"],[91.58,"Come mine, girl"],[92.21,"We can stay up all night till the light show"],[94.05,"Come through"],
  [94.62,"She said, if I'm coming I'm coming to talk"],[96.28,"Ain't coming to cum, 'cause I'm done and I'm bored"],[97.96,"Not some little whore who will come anytime that you call"],[100.04,"We ain't cool anymore"],
  [102.98,"Why you gotta be like that?"],[104.36,"You know you'll miss me"],[105.03,"And you'll be right back"],[106.02,"And you're not a whore"],[106.70,"You shouldn't speak like that"],[108.09,"I'm nothin' but honest"],[108.97,"You know how it is"],[109.74,"The life that I live, I don't wanna chick"],
  [111.44,"I don't wanna settle"],[112.33,"You know you're my favourite petal"],
  [113.63,"I don't give girls flowers"],[115.46,"I give you good wood though"],[116.70,"If you want me all for yourself"],[118.05,"Then, darlin', you probably should go"],[119.98,"There's no way I'ma stand in the rain"],[121.59,"I can still make you say my name"],[123.23,"Say my name, say my name"],[124.83,"Life without me might drive you insane"],
  [127.14,"I don't give girls flowers"],[128.93,"I give you good wood though"],[130.08,"If you want me all for yourself"],[131.52,"Then, darlin', you probably should go"],[133.44,"There's no way I'ma stand in the rain"],[135.02,"I can still make you say my name"],[136.59,"Say my name, say my name"],[138.29,"Life without me might drive you insane"],
  [141.38,"I'll bring you flowers in the pouring rain"],[144.83,"Living without you is driving me insane"],[148.32,"I'll bring you flowers, I'll make your day"],[151.53,"The tears you cry, I'll dry them all away, away"]
];

LYRICS["great-expectation-sienna-spiro"] = [
  [13.90,"In my head, you lay down next to me"],[17.05,"Kiss my lips, hold me carefully"],[20.25,"Say goodbye and feel all the withdrawals"],[26.24,"But it's not the same in reality"],[29.73,"I say your name, but you don't get back to me"],[33.04,"Till you got something you need me for"],
  [37.78,"So I sing just to know I'm alive"],[42.10,"And I cried all the tears I could cry"],[45.76,"If happiness is just an illusion"],[48.56,"You were the best I ever had"],[52.12,"If you can't be what I want"],[55.12,"And the things you say aren't true"],[58.74,"All I need is the great expectation of you"],[64.58,"Expectation of you"],
  [68.15,"The tracks of my tears go back for years"],[71.36,"When I was young, I've always had the fears"],[74.66,"One would leave, so I held on so long"],[80.65,"But to each their own, you come and go a lot"],[84.14,"It's black and white, but I go back and change the plot"],[87.68,"Just to have you in the way I want"],
  [92.26,"So I sing just to know I'm alive"],[96.56,"And I cried all the tears I could cry"],[100.16,"If happiness is just an illusion"],[103.00,"You were the best I ever had"],[106.54,"If you can't be what I want"],[109.45,"And the things you say aren't true"],[113.08,"All I need is the great expectation of you"],
  [119.56,"Cry my tears and let them dry"],[122.67,"Cry my tears and testify"],[125.85,"You exist inside my mind"],[129.06,"You so, so I"],
  [132.30,"Sing just to know I'm alive"],[135.06,"And I cried all the tears I could cry"],[138.55,"If happiness is just an illusion"],[141.40,"You were the best I ever had"],[144.90,"If you can't be what I want"],[147.75,"And the things you say aren't true"],[151.45,"All I need is the great expectation of you"],
  [158.15,"All I need is"],[162.28,"All I need is you"]
];

LYRICS["this-is-my-house-sienna-spiro"] = [
  [9.52,"I only want to be there to kiss you"],[13.38,"As you want to be kissed, when you need to be kissed"],[18.23,"Where I want to kiss you"],[20.51,"'Cause it's my house and I plan to live in it"],[31.01,"My house"],[33.32,"I'm not going anywhere for now"],[40.48,"Mmm, yeah"],[44.82,"Come in through the blue door"],[48.60,"In and out of my thoughts"],[52.25,"You can talk to the neighbours"],[55.71,"They'll tell you that it took me ages"],[59.65,"Step into the swimming pool"],[63.15,"I built it with the tears you put into my eyes"],[67.84,"Every time you tried to leave me"],[73.82,"I'm not coming to you, that was all that I knew 'fore I was someone"],[81.16,"And I built every wall, they can't break, they can't fall down for no one"],[88.11,"Baby, this is my house, my house"],[91.81,"Baby, this is my house, my house"],[95.58,"Baby, this is my house, my house"],[99.74,"For me"],[103.91,"Come into my kitchen"],[107.48,"I built it with my bare hands"],[111.18,"I bled into the foundation"],[114.82,"I'll be here till I'm cremated"],[118.27,"And Lord, when you take me, Lord, when you take me, Lord, you can take me"],[124.74,"But you can't take my house, my house"],[128.81,"Can't take my house, my house"],[132.40,"Baby, this is my house, my house"],[136.10,"Everything you had is mine now"],[140.00,"Baby, this is my house, my house"],[144.03,"For me"],[147.60,"My house, ooh-oh"],[154.52,"Oh"],[158.62,"My house, yeah"]
];

LYRICS["sienna-time-you-and-me"] = [
  [1.86,"I stand on my own two feet"],[5.66,"We could die on the same page next week"],[9.76,"If you don't do what you want, say what you mean"],[14.46,"Don't do it at all, don't do that to me"],[19.50,"I think of the stain and know it is long"],[23.72,"The way that someone is leaving this world"],[28.00,"Can be so sentimental"],[32.30,"Maybe I'm too sentimental"],[37.72,"And as you lay here wishing for last week"],[45.83,"You'll never get back what you spent on me"],[53.79,"Time waits for no one, naturally"],[61.55,"If we could be no one, we could be free"],[69.56,"Time, you and me"],[79.48,"He'll waste the days till forty-five"],[83.25,"Then say, 'How lonely am I, how lonely am I'"],[87.39,"And regrets the time as he waits to die"],[91.32,"'Cause he never did what he thought he might"],[94.56,"And everybody rides the carousel, that's what it cost"],[98.44,"To get on again and off again, to lose the ones you love"],[102.52,"But to have them for the hours and the minutes that there was"],[106.75,"Hours that there was"],[109.82,"And as you lay here wishing for last week"],[117.83,"You'll never get back what you spent on me"],[125.79,"Time waits for no one, so naturally"],[133.75,"If we could be no one, we could be free"],[141.61,"Time, you and me"],[149.54,"Time, you and me, oh"],[158.85,"Come now, let's walk down the long road ahead"],[166.83,"You could be someone or someone instead"],[174.61,"And as you lay here wishing for last week"],[181.92,"You'll never get back what you spent on me"],[189.84,"Time waits for no one, naturally"],[197.60,"If we could be no one, we could be free"],[205.65,"Time, you and me"]
];

LYRICS["mono-no-aware-sienna-spiro"] = [
  [18.38,"I see it everywhere"],[22.72,"The way things start to end"],[27.18,"Mono no aware"],[31.09,"I used to get so scared"],[35.57,"For flowers to expire"],[39.93,"For love to lose desire"],[44.12,"For you to get too tired"],[48.25,"I'm scared of getting tired"],[52.61,"How rivers dry and tears subside"],[57.18,"Nights will end and come again"],[60.90,"It's okay to fall and turn to blue"],[65.06,"It's okay to love and okay to lose"],[69.30,"But the beauty is you don't have to choose"],[83.66,"Everybody dies"],[86.59,"And I still ask why"],[90.92,"Why people still"],[95.16,"Make themselves cry"],[99.27,"But mono no aware"],[102.57,"It's gentle, but it's scarce"],[107.56,"To find someone you"],[111.87,"Truly care about"],[115.90,"Our rivers dry and tears subside"],[120.35,"Nights will end and come again"],[123.94,"It's okay to fall and turn to blue"],[127.94,"It's okay to love and okay to lose"],[131.81,"So as rivers dry and tears subside"],[136.61,"Nights will end and come again"],[140.22,"It's okay to fall and turn to blue"],[144.41,"It's okay to love and okay to lose"],[148.46,"But the beauty is you don't have to choose"],[157.42,"But the beauty is you don't have to choose"],[173.77,"You don't have to choose"],[177.37,"Mmm"],[181.14,"No"]
];

LYRICS["autumn-leaves-sienna-spiro"] = [
  [13.75,"The falling leaves drift by the window"],[24.40,"The autumn leaves of red and gold"],[33.30,"I see your lips, the summer kisses, hmm"],[42.76,"The sunburned hands I used to hold"],[51.75,"Since you went away, the days grow long"],[59.79,"And soon I'll hear old winter's song"],[70.88,"But I miss you most of all, my darling"],[79.96,"When autumn leaves start to fall"],[88.92,"But I miss you most of all, my darling"],[101.25,"When autumn leaves start to fall"],[110.72,"When autumn leaves start to fall"],[121.21,"Fall"],[125.73,"Fall"],[130.27,"Fall"],[134.78,"Start to fall"],[139.32,"Start to fall"],[143.85,"Start to fall"],[148.40,"Start to fall"],[152.94,"Start to fall"],[157.50,"Start to fall"]
];

LYRICS["sienna-you-stole-the-show-revisited"] = [
  [19.21,"You stole the show, got a standing ovation"],[27.20,"I lost control from the stage, from your face, and"],[35.18,"You don't say hello, I can't wait, I'm impatient"],[43.55,"Yeah, you stole my show, so I chase you to the pavement"],[51.70,"Wrap me in your arms again, the adrenaline makes me shiver"],[59.57,"Show me that you're genuine, that I'm safe again, that you came here different"],[67.39,"No time to define, but before we get closer"],[75.22,"I ask if you love me, and you just shrug your shoulders"],[91.98,"You stole the show, now the crowd's coming through, I just sink into you"],[99.87,"Just blowing smoke 'cause this moment will end, I'll be back at the scene you left cold"],[107.58,"My love turns green, and oh, you made me hate myself, mmm"],[115.76,"You stole it all, so I wait just to save this"],[123.40,"Wrap me in your arms again, the adrenaline makes me shiver"],[131.25,"Show me that you're genuine, that I'm safe again, that you came here different"],[139.34,"No time to define, but before we get closer"],[147.22,"I ask if you love me, and you just, won't you just"],[155.48,"Wrap me in your arms again, the adrenaline makes me shiver"],[163.48,"Show me that you're genuine, that I'm safe again, that you came here different"],[171.66,"No time to define, but before we get closer"],[180.86,"I ask if you love me, and you just"],[193.48,"Shrug your shoulders"]
];

LYRICS["sienna-die-on-this-hill-unplugged"] = [
  [13.19,"Got me to stay, said that you need me"],[18.88,"Starved 'cause his words don't have a meaning, no, they don't"],[27.43,"At least not to me"],[30.72,"There'll be a day I'll be more creative"],[36.25,"A poetic way to say I'm not leaving to the world"],[44.99,"Not to your face"],[49.39,"Oh, I'll take my pride, stand here for you"],[56.90,"No, I'm not blind, just seeing it through"],[62.73,"You'd take my life just for the thrill"],[68.67,"I'll take tonight and die on this hill"],[74.94,"I always will"],[82.82,"I know that I look stubborn, impatient"],[88.64,"But you wrote the book, I just took a page out to be loved"],[97.21,"To be loved and nothing more"],[100.27,"And you kept your word, do you want a medal?"],[106.10,"The way that someone leaves this world is all just levels to me now"],[113.71,"Oh-oh, to me now"],[121.04,"I'll take my pride, stand here for you"],[126.73,"Know I'm not blind, just seeing it through"],[132.64,"You'd take my life just for the thrill"],[138.50,"I'll take tonight and die on this hill"],[144.65,"I always will"],[150.48,"I'll be here the whole night, I'll be here 'cause I can"],[156.15,"Yeah, I know you don't care"],[158.83,"I know nothing could matter"],[162.48,"God, I wish something mattered to you"],[170.36,"I'll take my pride, stand here for you"],[176.13,"Know I'm not blind, just seeing it through"],[181.85,"Well, you'd take my life just for the thrill"],[187.77,"Well, I'll take tonight and die on this hill"],[194.43,"I always"],[198.55,"Always"],[203.22,"I always"],[208.46,"Will"]
];

LYRICS["sienna-maybe"] = [
  [9.28,"All I wanted was to be your hostage"],[14.18,"For you to tie me up and never let me leave"],[19.25,"If we're honest, it took the longest"],[24.02,"Time for you to even notice I was here"],[29.56,"You said you'd take me places"],[32.44,"Then you kept me waiting"],[34.90,"How the hell could I be so wrong?"],[39.72,"But now, I'm feeling jaded"],[42.10,"I thought I was your favorite"],[44.95,"I believed in you for so long"],[48.40,"Well, maybe this time you'll hurt like I do"],[53.66,"You won't get no sympathy 'cause I got none from you"],[58.35,"Couldn't make up your mind, well, mine's not confused"],[63.64,"Nothing left in me that wants to leave a space for you"],[68.30,"So maybe this time, maybe this time"],[73.66,"Maybe this time, you'll feel like I do"],[78.46,"It don't feel so good, oh, when it's your turn in blue"],[94.38,"I don't want this, you make me nauseous"],[99.26,"Can't believe it gave me butterflies to look at you"],[104.10,"You think I'm bleeding, you must be dreaming"],[109.60,"You slept on me while she slept under you"],[114.30,"Makes me laugh 'cause we want the things we can't have"],[118.34,"You fall 'cause and I fall back, you always been the same"],[123.42,"But maybe this time you'll hurt like I do"],[128.66,"You won't get no sympathy 'cause I got none from you"],[133.34,"Couldn't make up your mind, mine's not confused"],[138.60,"Nothing left in me that wants to leave a space for you"],[143.32,"So maybe this time, maybe this time"],[148.54,"Maybe this time, you'll feel the way that I do"],[153.43,"And it don't feel so good when it's your turn in blue"],[168.98,"Don't call my name 'cause I'm not yours"],[173.96,"It's not the same as it was before"],[178.96,"Don't fantasize when you picture me"],[181.46,"When you close your eyes and I'm in your dreams"],[183.98,"Don't matter to her, don't matter to me"],[186.66,"You think I care, I don't"],[188.70,"Maybe this time you'll hurt like I do"],[193.66,"You won't get no sympathy 'cause I got none from you"],[198.42,"Couldn't make up your mind, mine's not confused"],[203.62,"Nothing left in me that wants to leave a space for you"],[208.30,"So maybe this time, maybe this time"],[213.68,"Maybe this time, you'll feel like I do"],[218.48,"It don't feel so good, oh, when it's your turn in blue"]
];

LYRICS["sienna-die-on-this-hill"] = [
  [16.43,"Got me to stay, said that you need me"],[22.11,"Starved 'cause his words don't have a meaning, no, they don't"],[30.66,"At least not to me"],[33.95,"There'll be a day I'll be more creative"],[39.48,"A poetic way to say I'm not leaving to the world"],[48.22,"Not to your face"],[52.62,"Mmm, I'll take my pride, stand here for you"],[60.13,"No, I'm not blind, just seeing it through"],[65.96,"You'd take my life just for the thrill"],[71.90,"I'll take tonight and die on this hill"],[78.17,"I always will"],[86.05,"I know that I look stubborn, impatient"],[91.87,"But you wrote the book, I just took a page out to be loved"],[100.44,"To be loved and nothing more"],[103.50,"And you kept your word, do you want a medal?"],[109.33,"The way that someone leaves this world is all just levels to me now"],[116.61,"Oh-oh, to me now"],[124.27,"I'll take my pride, stand here for you"],[129.96,"Know I'm not blind, just seeing it through"],[135.87,"You'd take my life just for the thrill"],[141.73,"I'll take tonight and die on this hill"],[147.88,"I always will"],[153.71,"I'll be here the whole night, I'll be here 'cause I can"],[159.38,"Yeah, I know you don't care"],[162.06,"I know nothing could matter"],[165.71,"God, I wish something mattered to you"],[173.94,"I'll take my pride, stand here for you"],[179.81,"Know I'm not blind, just seeing it through"],[185.58,"You'd take my life just for the thrill"],[191.37,"Well, I'll take tonight and die on this hill"],[197.86,"I always"],[202.59,"Always"],[206.93,"I always"],[211.60,"Will"]
];

LYRICS["sienna-pure"] = [
  [14.99,"Used to do it all so pure"],[17.99,"For the love of the song no more"],[20.90,"Now I think about an applause"],[23.71,"When I open my mouth"],[26.59,"I've abandoned my emotions"],[29.45,"I've isolated myself"],[32.30,"When I see my mother in pain"],[35.02,"Wish I could feel what she felt"],[38.05,"And I don't know"],[41.04,"What this all means"],[43.98,"What this all means"],[46.63,"It don't feel like me"],[49.29,"And sometimes I get insecure"],[52.29,"So I wear a dress on the town"],[55.07,"Hope a man notices me"],[57.95,"I don't know, it makes me proud"],[60.79,"I get jealous and I"],[63.65,"See myself in my sister's eyes"],[66.45,"At least she can have a good time"],[69.32,"At least she can calm down"],[72.31,"And I don't know"],[75.33,"What this all means"],[78.22,"What this all means"],[80.84,"It don't feel like me"],[83.71,"And you won't give me the deal"],[89.45,"I wish I was real"],[92.27,"I wish I was"],[94.47,"I think about it all the time"],[100.12,"What I've been doing with my life"],[105.85,"'Cause when it calls me back again"],[111.53,"I hope it meant something"],[117.32,"I hope it meant something"],[126.67,"I've been losing all my friends"],[129.44,"Stepping up onto the ledge"],[132.21,"Thinking I can be an angel"],[135.05,"But keep falling instead"],[137.87,"Find it hard to stay connected"],[140.84,"When I wanna feel protected"],[143.85,"So hold me, won't you?"],[146.53,"Just hold me 'cause"],[148.78,"I think about it all the time"],[154.30,"What I've been doing with my life"],[160.10,"'Cause when it calls me back again"],[165.80,"I hope it meant something"],[170.10,"Oh"],[171.58,"I think about it all the time, no"],[177.13,"What I've been doing with my life"],[182.98,"'Cause when it calls me back again"],[188.75,"I hope it meant something"],[194.53,"I hope I meant something"],[203.73,"I don't know the meaning of"],[206.70,"Anything in this song"],[209.55,"Just wanna feel special"],[213.16,"I just wanna feel"]
];

LYRICS["sienna-material-lover"] = [
  [10.09,"Well, I like these things you can buy with money"],[14.74,"On a day that's wrong but a day that's sunny"],[19.44,"Pick it up with my hands, put it out on sale"],[23.49,"They can't do it like me-e-e, can't do it like me"],[28.80,"When it's all going up like a burning fever"],[33.43,"My feet on the ground like a super feeler, yeah"],[38.03,"And I don't know much, but I know this one thing"],[42.08,"They can't do it like me-e-e, can't do it like me, yeah"],[47.99,"I crave a real connection, I like to turn the page"],[52.68,"With my hands and my nails that match my summer shade"],[57.36,"Some call that superficial to wanna touch the cover"],[62.25,"But I'm a material lover, yeah"],[69.66,"Material lover, mmm"],[75.24,"When I step outside and I see what's happening"],[79.85,"It's not fair, not fair, not fair, it's a pattern"],[84.60,"When I go too far but come back quickly"],[88.67,"They can't do it like me-e-e, can't do it like, they can't do it like me"],[94.56,"I crave a real connection, I like to turn the page"],[99.24,"With my hands and my nails that match my summer shade"],[103.84,"Some call that superficial to wanna touch the cover"],[108.89,"But I'm a material lover, yeah"],[115.94,"A material lover"],[120.07,"I want a real thing now, mmm"],[124.75,"I want a real thing now"],[128.97,"I do, I do, I do-o-o-o"],[134.81,"Material lover, yeah"],[149.94,"Materi-eria-al, say it when you don't want"],[154.95,"I could give a real thing to you, oh"],[159.39,"Materi-eria-al, say that you want more"],[164.22,"I could give a real thing to you, oh"]
];

LYRICS["sienna-hes-not-my-baby-im-his"] = [
  [11.38,"I wait all Sunday"],[13.78,"For him to come for me"],[16.13,"When he don't by Monday, I cry myself into a hunger"],[20.88,"And he's twice my age"],[23.27,"It's a guilty pleasure"],[25.60,"For a man that seems like he should know, he should know better"],[29.46,"He talk, talk down to me"],[31.14,"Don't know what he want, want, want from me"],[33.06,"He could have it all so easily"],[36.22,"But instead, he make me, make me go"],[38.80,"Oh"],[39.96,"He got me in the bag, but he won't take it home"],[44.78,"I like it when he says I'm too young to know"],[49.69,"To know what this is"],[51.93,"'Cause he ain't about a thing"],[54.36,"Come down to business"],[56.60,"He's not my baby, I'm his"],[60.44,"Not my baby, I'm his"],[65.06,"No, no"],[68.56,"Stroking my hair"],[70.99,"To stroke my ego"],[73.39,"And no one feels quite as seen as when a child gets chosen"],[78.21,"And I'm half his age"],[80.57,"It's a rite of passage"],[83.06,"To know it's wrong"],[84.32,"But not quite care"],[85.36,"Don't care what happens"],[86.76,"He talk, talk down to me"],[88.44,"Don't know what he want, want, want from me"],[90.80,"He could have it all so easily"],[93.57,"But instead, he make me, make me go"],[96.16,"Oh"],[97.06,"He got me in the bag, but he won't take it home"],[102.10,"I like it when he says I'm too young to know"],[106.95,"To know what this is"],[109.22,"'Cause he ain't about a thing"],[111.58,"Come down to business"],[113.90,"He's not my baby, I'm his"],[116.34,"He got me in the bag, but he won't take it home"],[121.14,"I like it when he says I'm too young to know"],[126.11,"To know what this is"],[128.29,"'Cause he ain't about a thing"],[130.69,"Come down to business"],[132.57,"He's not, he's not, no"],[135.45,"He got me in the bag, but he won't take it home"],[140.26,"I like it when he says I'm too young to know"],[145.06,"To know what this is"],[147.36,"'Cause he ain't about a thing"],[149.86,"Come down to business"],[152.22,"He's not my baby, I'm his"]
];

LYRICS["sienna-were-not-in-love"] = [
  [0.87,"Maybe it's the hour"],[4.80,"Maybe it's the way you looked at me"],[8.68,"Now I've been devoured"],[12.69,"There's no way that I could ever leave"],[19.12,"I'm burning to keep you warm"],[23.06,"You leave"],[26.97,"I'm waiting at the door"],[30.65,"We're not in love, but we make love"],[34.84,"And that don't make no sense"],[38.78,"You're right here, but you're not here"],[42.57,"When I'm laying on your chest"],[46.07,"I'll keep coming back to you anyways"],[50.03,"I'll get close to you, not enough to break"],[54.03,"We're not in love, but we make love"],[59.28,"Oh"],[63.83,"Maybe it's your power"],[67.74,"Maybe you don't need me anymore"],[71.49,"You love to stick around just"],[74.94,"To push me up the wall"],[78.62,"You"],[81.80,"Say I'm pretty but you're semi-hard"],[86.89,"Oh"],[89.89,"I'm laughing but I'm in the dark"],[93.62,"We're not in love, but we make love"],[97.85,"And that don't make no sense"],[101.74,"You're right here, but you're not here"],[105.48,"When I'm laying on your chest"],[109.04,"I'll keep coming back to you anyways"],[112.97,"I'll get close to you, not enough to break"],[117.26,"We're not in love, but we make love"],[121.92,"Oh"],[125.93,"You go down while I'm up in my head"],[129.97,"And you left after I got undressed, and that's"],[134.69,"That's unbelievable"],[138.57,"You're unbelievable"],[142.76,"We're not in love, but we make love"],[147.01,"And that don't make no sense"],[150.95,"You're right here, but you're not here"],[154.84,"But I could just pretend"],[158.27,"I'll keep coming back to you anyways"],[162.10,"I'll get close to you, not enough to break"],[166.48,"We're not in love, but we make love"]
];

LYRICS["sienna-back-to-blonde"] = [
  [8.43,"You were the king of everything"],[12.51,"I was your angel 'til you clipped my wings"],[15.81,"Sorry if I look a mess, I'm still wiping the blood off my dress"],[19.68,"I got people, they're coming for me"],[23.20,"And, I'm on the run now while I'm still free"],[28.55,"Calm and collected, you're dead to me"],[31.95,"How did you think I was so naive?"],[33.96,"Thought there'd be tears rolling down my cheeks"],[35.95,"I bet that you never thought"],[38.98,"I'd go back to blonde"],[40.92,"Back to my old ways, back to no heart"],[44.92,"Back to that bitch that couldn't fall in love"],[48.93,"Bleaching our memories right down to the root"],[52.38,"Baby, now that you're gone"],[54.83,"I'll go back to blonde"],[58.70,"Blonde"],[60.82,"Blonde"],[62.73,"Now that you're gone"],[64.88,"Blonde"],[66.87,"Blonde"],[67.95,"Oh baby, now that you're gone"],[74.60,"I'm coming back, dripping gold"],[78.53,"Gimme a reason not to go"],[81.97,"Thought you could take everything from me"],[84.06,"Cut off my hair tryna make me bleed"],[86.15,"I bet that you never thought"],[88.93,"I'd go back to blonde"],[91.05,"Back to my old ways, back to no heart"],[94.94,"Back to that bitch that couldn't fall in love"],[98.90,"Bleaching our memories right down to the root"],[102.36,"Baby, now that you're gone"],[104.87,"I'll go back to blonde"],[108.71,"Blonde"],[110.88,"Blonde"],[112.75,"Now that you're gone"],[114.71,"Blonde"],[116.73,"Blonde"],[117.91,"Oh baby, now that you're gone"],[120.87,"I'll go back to blonde"],[125.49,"I will, I will, I will"],[128.59,"And I bet you never thought"],[131.99,"Blonde"],[133.82,"Oh baby, now that you're gone"],[136.73,"I'll go back to blonde"],[139.08,"Back to my old ways, back no heart"],[142.95,"Back to that bitch that couldn't fall in love"],[146.95,"Bleaching our memories right down to the root"],[150.41,"Baby, now that you're gone"],[155.19,"I'll go back to blonde"]
];

LYRICS["emerald-eyes-alex-warren"] = [
  ["00:06.27","There's a knock at the door, there's a moon on the rise"],["00:10.31","Cover my eyes"],["00:11.57","Follow you blind"],["00:13.72","And I don't wanna know where I'm going tonight"],["00:17.53","I'm on the line"],["00:18.94","On the line"],["00:19.91",""] ,
  ["00:19.91","And I'm helpless"],["00:21.24","Hopeless"],["00:22.22","Oh, and she knows it"],["00:24.09","Taking me right to the edge"],["00:27.31","And I"],["00:28.29",""] ,
  ["00:28.42","Can't fight the feeling, I'm ready to dive"],["00:32.09","Right off the deep end in emerald eyes"],["00:35.81","That drug you're dealing is healing a piece of my soul"],["00:40.71","Say you'll never let me go"],["00:43.16","Oh, oh"],["00:46.84","Oh, say you'll never let me go"],["00:50.24",""] ,
  ["00:50.61","Oh, she cuts like a rose"],["00:52.71","She's walking on air"],["00:54.54","Not even close"],["00:56.01","No one compares"],["00:57.02","She's a fire starter, stole my heart enough to make a man a martyr"],["01:01.79","I'm already there"],["01:03.61",""] ,
  ["01:04.26","And I'm helpless"],["01:05.52","Hopeless"],["01:06.54","Oh, and she knows it"],["01:08.29","Taking me right to the edge"],["01:11.62","And I"],["01:12.51",""] ,
  ["01:12.76","Can't fight the feeling, I'm ready to dive"],["01:16.42","Right off the deep end in emerald eyes"],["01:20.11","That drug you're dealing is healing a piece of my soul"],["01:24.93","Say you'll never let me go"],["01:27.14",""] ,
  ["01:27.51","Oh, oh"],["01:31.11","Oh, say you'll never let me go"],["01:34.81","Oh, oh"],["01:38.47","Oh"],["01:39.77",""] ,
  ["01:40.57","And when I go to sleep"],["01:42.57","You're running my dreams"],["01:44.53","Sweating through the sheets"],["01:46.07","Like it's summer '19"],["01:48.19","When I go to sleep"],["01:49.89","You're running my dreams"],["01:51.93","Sweating through the sheets"],["01:53.45","Like it's summer '19, '19"],["01:56.82",""] ,
  ["01:57.04","Whoa, oh"],["02:00.77","Oh, say you'll never let me go"],["02:04.47","That drug you're dealing is healing a piece of my soul"],["02:09.24","Say you'll never let me go"],["02:11.72",""] ,
  ["02:10.23","And when I go to sleep"],["02:12.03","You're running my dreams"],["02:13.98","Sweating through the sheets"],["02:15.50","Like it's summer '19"],["02:17.71","When I go to sleep"],["02:19.42","You're running my dreams"],["02:21.48","Sweating through the sheets"],["02:22.95","Like it's summer '19, '19"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["same-stars-alex-warren"] = [
  ["00:08.16","Find me lost"],["00:10.31","In another lovely thought"],["00:12.91","Buried somewhere I forgot"],["00:15.71","Buried somewhere I forgot"],["00:19.02","Nothing's changed"],["00:21.09","Nothing but everything"],["00:23.86","How I used to love this place"],["00:26.64","Oh, we used to love this place"],["00:29.37","If Heaven can't help me"],["00:32.17","Can somebody tell me how the"],["00:35.49","Same stars"],["00:38.24","Over my head are the same stars"],["00:43.04","From the night that you left? Oh"],["00:47.09","Tell me, how do I exist"],["00:49.91","In a world that you're not in?"],["00:52.44","As I lay in the dark"],["00:55.47","Still looking at the same stars"],["01:01.09","They'll never be the same stars"],
  ["01:08.21","Take me back"],["01:10.22","Running through the moonlit grass"],["01:12.97","I was getting used to that"],["01:15.72","Now it's just a photograph"],["01:19.12","Comes in waves"],["01:21.19","Waiting on the dawn to break"],["01:23.86","I think about you every day"],["01:26.57","God, I really miss your face"],["01:29.36","If Heaven can't help me"],["01:32.01","Can somebody tell me how the"],["01:35.41","Same stars"],["01:38.22","Over my head are the same stars"],["01:43.04","From the night that you left? Oh"],["01:47.06","Tell me, how do I exist"],["01:49.81","In a world that you're not in?"],["01:52.39","As I lay in the dark"],["01:55.52","Still looking at the same stars"],["02:01.06","They'll never be the same stars"],
  ["02:07.51","Just stay with me somehow"],["02:12.32","Where are you now?"],["02:15.02","Where are you now?"],["02:18.70","Still looking at the same stars"],["02:24.30","They'll never be the same"],["02:27.00","I'll never be the same"],["02:29.57","So tell me how the"],["02:31.38","Same stars over my head"],["02:35.97","Are the same stars"],["02:38.88","From the night that you left, oh"],["02:42.93","Tell me, how do I exist"],["02:45.71","In a world that you're not in?"],["02:48.21","As I lay in the dark"],["02:51.43","Still looking at the same stars"],["02:56.91","They'll never be the same stars"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["passenger-alex-warren"] = [
  ["00:03.60","I know these things aren't typical"],["00:07.25","I don't wanna come across difficult"],["00:10.79","I wish I could climb inside of your head"],["00:14.36","And make you a little less miserable"],["00:17.84","I'm losing your time to a metronome"],["00:21.36","I'm in the next room with a megaphone"],["00:24.85","I know you didn't hear a word that I said"],["00:28.53","I try, try, try"],["00:32.55","How do I drive from the passenger side?"],["00:35.81","I've been holdin' on tight to a telephone line"],["00:39.50","Living your dream, baby, what about mine?"],["00:42.96","Tell me I'm yours, wonder what it feels like"],["00:49.35","What it feels like"],
  ["00:53.20","Let's run from it all for the hell of it"],["00:56.60","Oh God, put me back in my element"],["01:00.12","We talk about things we don't wanna address"],["01:03.78","I guess I'll make room for the elephant"],["01:07.16","But I miss the way the night sounds back on the coast"],["01:10.77","Up dancing with the lights out, burning the toast"],["01:14.29","Yeah, I miss a lot of things, but I miss you the most"],["01:17.85","Yeah, I try, try, try"],["01:22.02","How do I drive from the passenger side?"],["01:25.10","I've been holdin' on tight to a telephone line"],["01:29.01","Living your dream, baby, what about mine?"],["01:32.20","You tell me I'm yours, wonder what it feels like"],["01:38.67","What it feels like"],
  ["01:44.25","I pour my heart out on a silver plate"],["01:47.95","I would die for you, by the way"],["01:51.55","Not that you would mind"],["01:53.22","But I try, I try, I try, try"],["02:00.97","How do I drive from the passenger side?"],["02:04.05","I've been holdin' on tight to a telephone line"],["02:07.85","Living your dream, baby, what about mine?"],["02:11.10","You tell me I'm yours, wonder what it feels like"],["02:17.58","What it feels like"],["02:21.95","Living your dream, baby, what about mine?"],["02:25.25","You tell me I'm yours, wonder what it feels like"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["rescuer-alex-warren"] = [
  ["00:08.55","Cover my tracks, I can't bear to go back"],["00:12.08","To the place I was before"],["00:16.90","Took all the last of the strength that I had"],["00:20.46","To collapse right at your door"],["00:25.32","All the damage was done"],["00:30.34","I thought that I was"],["00:32.25","A stranger to love till you said the word"],["00:36.70","When I was six feet down in the dirt"],["00:40.84","You kissed me to life, my rescuer"],["00:46.26","Everything in this world broke my heart till you broke the curse"],["00:56.68","Oh, my rescuer"],
  ["01:07.50","Out of reasons, torn to pieces"],["01:11.34","Poisoned my lungs just to know I'm still breathing"],["01:15.96","All my life was carved in stone"],["01:20.07","How'd you find my long lost soul?"],["01:26.84","The damage was done"],["01:28.95","I thought that I was"],["01:30.84","A stranger to love till you said the word"],["01:35.40","When I was six feet down in the dirt"],["01:39.45","You kissed me to life, my rescuer"],["01:44.85","Everything in this world broke my heart till you broke the curse"],["01:55.19","Oh, my rescuer"],
  ["02:06.89","Out of exile, into your hands"],["02:11.00","Your arms are my promised land"],["02:15.20","Waking me up, wrecking my plans"],["02:19.36","Changed the fate of"],["02:21.25","A stranger to love till you said the word"],["02:25.61","When I was six feet down in the dirt"],["02:29.65","You kissed me to life, my rescuer"],["02:35.10","Everything in this world broke my heart"],["02:37.74","A stranger to love till you said the word"],["02:42.40","When I was six feet down in the dirt"],["02:46.38","You kissed me to life, my rescuer"],["02:51.80","Everything in this world broke my heart"],["02:54.34","Everything I held fell apart till you broke the curse"],["03:04.48","Oh, my rescuer"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["cry-wolf-alex-warren"] = [
  ["00:03.17","The devil don't knock at your door"],["00:05.90","When you got no soul to sell"],["00:09.28","Why would I try to ruin your life when you're doing it by yourself?"],["00:15.27","There ain't no water to drink"],["00:18.05","When you're poisoning the well"],["00:21.42","Tears run dry, nobody gon' buy that empty cry for help"],["00:26.45","When I hear your name"],["00:29.45","It starts a fire in my veins"],["00:32.53","When I gave you grace"],["00:35.57","You threw it right back in my face"],["00:38.82","So don't come crying to me, I won't"],["00:43.50","Lose anymore sleep, I know"],["00:46.50","You're spinning your lies"],["00:48.85","Only so many times you can cry wolf"],
  ["00:54.93","What you've done in the dark"],["00:57.48","Gonna see the light of day"],["01:00.90","Ain't no sense seeking revenge"],["01:03.63","I don't wanna have to dig two graves"],["01:05.94","When I hear your name"],["01:08.93","It starts a fire in my veins"],["01:12.04","When I gave you grace"],["01:14.95","You threw it right back in my face"],["01:18.23","So don't come crying to me, I won't"],["01:22.97","Lose anymore sleep, I know"],["01:25.99","You're spinning your lies"],["01:28.32","Only so many times you can cry wolf"],
  ["01:32.75","You were on the phone, said you were alone"],["01:35.92","Whispers in the dark, now your covers blown"],["01:39.05","Let you set me up, just to watch me fall"],["01:41.97","Knew it was a trap, why'd I take the call?"],["01:45.04","Played the victim when you're not in control"],["01:48.04","Said you love me, I know you fucking don't"],["01:51.07","I was there for you, tell me, where were you"],["01:54.20","When I needed you most?"],["01:57.22","Don't come crying to me"],["01:59.93","I won't"],["02:00.93","Lose anymore sleep"],["02:02.97","I know"],["02:03.95","You're spinning your lies"],["02:07.45","Oh"],
  ["02:08.23","When I hear your name"],["02:11.17","It starts a fire in my veins"],["02:14.26","When I gave you grace"],["02:17.30","You threw it right back in my face"],["02:20.48","So don't come crying to me, I won't"],["02:25.30","Lose anymore sleep, I know"],["02:28.23","You're spinning your lies"],["02:30.60","Only so many times you can cry"],["02:33.65","Only so many times you can cry wolf"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["fine-place-to-die-alex-warren"] = [
  ["00:04.16","Turning on the TV"],["00:06.18","A man dressed in black says"],["00:08.16","The tensions and waters are rising"],["00:12.38","Happiness is treason"],["00:14.40","Fiction is fact"],["00:15.93","And a storm's always on the horizon"],["00:20.36","I hear the alarms"],["00:22.43","But here in your arms"],["00:24.60","Seems like a fine place to die"],["00:27.52","The world's on fire"],["00:30.68","I burn"],["00:32.70","Happily dancing with you"],["00:38.56","And I'll be"],["00:40.63","The soul you come crashing into"],["00:44.26","If it has to be the end"],["00:48.31","All I ask is that I get"],["00:55.80","To burn with you"],
  ["01:01.11","Love me like a scandal"],["01:03.12","Wreck me like a wave"],["01:04.70","Take me back to the place I remember"],["01:09.26","We could light a candle"],["01:11.36","Put a record on"],["01:12.78","Till we turn into ashes and embers"],["01:17.36","I hear the alarms"],["01:19.36","But here in your arms"],["01:21.48","Seems like a fine place to die"],["01:24.46","The world's on fire"],["01:27.66","I burn"],["01:29.68","Happily dancing with you"],["01:32.70","Take my body"],["01:35.53","And I'll be"],["01:37.56","The soul you come crashing into"],["01:41.20","If it has to be the end"],["01:45.23","All I ask is that I get"],["01:48.78","To burn with you"],["01:52.78","To burn with you"],
  ["01:58.15","Breathe me in"],["02:00.16","Breathe me out"],["02:02.22","Till the walls come crumbling down"],["02:06.25","Pull me close"],["02:08.30","Love me now"],["02:10.33","Till there's nothing left of this town"],["02:14.40","Breathe me in"],["02:16.48","Breathe me out"],["02:18.50","Till the walls come crumbling down"],["02:22.51","Pull me close"],["02:24.56","Love me now"],["02:26.70","Love me now"],["02:29.50","The world's on fire"],["02:32.75","I burn"],["02:34.78","Happily dancing with you"],["02:37.80","Take my body"],["02:40.67","And I'll be"],["02:42.64","The soul you come crashing into"],["02:46.26","If it has to be the end"],["02:50.41","All I ask is that I get"],["02:53.86","To burn with you"],["02:57.91","To burn with you"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["are-you-having-fun-alex-alex-warren"] = [
  ["00:06.81","Hey, Merry Christmas, Alex"],["00:10.01","Merry Christmas, Alex"],["00:13.01","Okay, it's our new addition this year"],["00:18.91","Hey, bubba"],["00:20.02","Hi, hi"],["00:25.33","There goes Alex, always on the move"],["00:29.13","Happy 4th of July, you nut"],["00:33.39","Whatever"],["00:38.52","There's Alex, he's a wild man"],["00:41.27","Alright, whoa!"],["00:43.26","Hey, you okay?"],["00:44.51","You alright?"],["00:45.84","You're tough"],["00:46.67","Say Happy Birthday, Alex"],["00:48.12","Happy birthday, Alex"],["00:49.59","Happy birthday, Alex"],["00:51.19","Happy birthday who?"],["00:52.47","Happy birthday me"],["00:54.37","Alright, say thumbs up!"],["00:58.74","Way to go, Alex"],["01:01.03","Way to go, Alex!"],["01:08.09","Way to go, Alex, whoo!"],["01:11.74","Alright, nice job!"],["01:19.01","What are you up to, Alex?"],["01:22.01","Are you making music?"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["i-miss-you-more-alex-warren"] = [
  ["00:12.85","I wrote a letter to you last night"],["00:16.12","Instead of talking to the dark"],["00:19.58","So much I wanna say"],["00:21.35","Ever since you've been away"],["00:23.01","And I don't wanna skip a part"],["00:26.33","I went out and bought your old car"],["00:29.70","That I wasn't old enough to drive"],["00:32.69","I didn't have your help, so I taught myself"],["00:36.36","Wish that I could take you for a ride"],["00:38.62","I miss you more"],["00:42.44","The more you miss"],["00:45.91","What I'd give to hear your voice"],["00:49.03","On nights like this"],["00:52.10","I miss you more"],["00:55.49","The more you miss"],["00:59.10","Seasons change"],["01:00.76","But there's some things"],["01:02.33","That time can't fix"],
  ["01:06.15","Will I be ready when the day comes?"],["01:09.69","When the world fits in my arms?"],["01:12.99","Will she have your eyes? Will she make me realize"],["01:16.31","All the things that you felt once?"],["01:19.59","Why is Heaven such a long way down?"],["01:23.02","Thought the worst would be over by now"],["01:26.33","Every dream come true"],["01:28.02","Everything I do"],["01:29.56","I still look for you in the crowd"],["01:32.02","I miss you more"],["01:35.74","The more you miss"],["01:39.16","What I'd give to hear your voice"],["01:42.30","On nights like this"],
  ["01:45.86","You would've loved to see"],["01:49.00","Who I'm turning out to be"],["01:52.29","And you would've loved to meet her"],["01:55.49","You were supposed to be here"],["01:59.22","You would've loved to see"],["02:01.97","The day that she married me"],["02:05.75","Why did you have to leave here?"],["02:09.20","You were supposed to be here"],["02:12.14","I miss you more"],["02:15.70","The more you miss"],["02:19.15","What I'd give to hear your voice"],["02:22.30","On nights like this"],["02:25.45","I miss you more"],["02:29.00","The more you miss"],["02:32.39","Seasons change"],["02:34.07","But there's some things"],["02:35.71","That time can't fix"],["02:38.74","I miss you more"],["02:38.85","I miss you more"],["02:42.07","I miss you more"],["02:45.49","I miss you more"],["02:48.93","The more you miss"],["02:52.40","Seasons change"],["02:54.14","But there's some things"],["02:55.77","That time can't fix"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["fever-dream-alex-warren"] = [
  ["00:10.29","How did you know"],["00:13.11","I was hoping for a sign?"],["00:19.21","My heart was so"],["00:22.55","Close to closing time"],["00:26.98","Something 'bout you hit me like a"],["00:29.24","Freight train to the chest"],["00:31.20","Ah, the day we met"],["00:33.40","All my loneliness"],["00:35.87","Left the room the second that you"],["00:38.20","Walked in, something like a fever dream"],["00:41.99","Haven't slept in weeks, I think I'm seeing things"],["00:46.42","Like our shadows dancing us out of our clothes"],["00:50.71","I'll be damned if you love me"],["00:53.40","Damned if you don't"],
  ["01:05.24","Maybe it's fate, maybe it's late"],["01:07.43","Told you I ain't no liar"],["01:09.65","Watching you leave's haunting my dreams"],["01:11.95","Baby, it hit me like a"],["01:13.68","Freight train to the chest"],["01:15.61","Ah, the day we met"],["01:17.83","All my loneliness"],["01:20.27","Left the room the second that you"],["01:22.58","Walked in, something like a fever dream"],["01:26.45","Haven't slept in weeks, I think I'm seeing things"],["01:30.87","Like our shadows dancing us out of our clothes"],["01:35.21","I'll be damned if you love me"],["01:37.81","Damned if you don't"],
  ["01:44.84","One foot on the edge"],["01:46.79","Ah, that silhouette"],["01:48.95","Ah, I can't forget"],["01:51.44","Something 'bout you hit me like a"],["01:53.71","Freight train to the chest"],["01:55.62","Ah, the day we met"],["01:57.82","All my loneliness"],["02:00.29","Left the room the second that you"],["02:02.59","Walked in, something like a fever dream"],["02:06.44","Haven't slept in weeks, I think I'm seeing things"],["02:10.86","Like our shadows dancing us out of our clothes"],["02:15.27","I'll be damned if you love me"],["02:17.83","Damned if you don't"],["02:22.04","Oh, if you don't"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["last-time-alex-warren"] = [
  ["00:16.57","The sun on your face burns in my brain"],["00:20.82","Flashes of the end of July"],["00:24.79","I swear I can taste the salt from the waves"],["00:29.01","Crashing in the back of my mind"],["00:33.13","Oh, I know"],["00:37.68","Everything happens for a last time, baby"],["00:41.28","Oh, I know"],["00:45.79","Wish I'd have known it was the last time"],["00:48.86","The house was a mess, shoes on the steps"],["00:53.46","Dancing with the radio on"],["00:57.41","Hair soaking wet, catching our breath"],["01:01.56","Running with the dogs in the yard"],["01:05.63","Oh, I know"],["01:10.21","Everything happens for a last time, baby"],["01:13.83","Oh, I know"],["01:18.32","Wish I'd have known it was the last time, baby"],
  ["01:38.36","Oh"],["01:41.99","Tell me why'd you have to go"],["01:44.91","Always thought I'd see you again, see you again"],["01:49.28","I thought I'd see you again, see you again"],["01:54.56","Oh"],["01:58.26","I don't want the door to close"],["02:01.22","Always thought I'd see you again, see you again"],["02:05.64","I thought I'd see you again, see you again"],["02:10.95","Oh, I know"],["02:15.25","Everything happens for a last time, baby"],["02:18.96","Oh, I know"],["02:23.37","Wish I'd have known it was the last time, baby"],["02:27.07","Oh, I know"],["02:31.52","Everything happens for a last time, baby"],["02:35.15","Oh, I know"],["02:39.76","Wish I'd have known it was the last time, baby"],["02:47.02","Tell me why'd you have to go"],["02:50.98","Oh, I know"],["02:55.92","Wish I'd have known it was the last time, baby"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["wildchild-alex-warren-song"] = [
  ["00:00.80","You were young enough to think I was invincible"],["00:07.13","And brave enough to think that you were too"],["00:13.03","You were on the rooftop singing all your favorite songs"],["00:18.16","Making up the words"],["00:20.48","And I was so amazed by you"],["00:24.75","Oh, my"],["00:26.46","Wildchild"],["00:29.53","You were born to hit the ground running"],["00:32.61","I haven't seen you in a while"],["00:35.73","But I always saw this coming"],["00:38.76","Don't let a cruel world take your light away"],["00:42.51","Just promise me you're gonna stay"],["00:45.03","Wild, child"],["00:49.52","Whoa"],["00:50.98","Wildchild"],
  ["00:55.99","You were learning how to skate in empty swimming pools"],["01:02.57","And laughing till the neighbors called the cops"],["01:08.47","You were always getting up to something"],["01:12.12","Never change that tune you're humming"],["01:15.27","Everybody knew that song, they just grew up and forgot"],["01:21.83","Wildchild"],["01:24.91","You were born to hit the ground running"],["01:27.98","I haven't seen you in a while"],["01:31.11","But I always saw this coming"],["01:34.08","Don't let a cruel world take your light away"],["01:37.79","Just promise me you're gonna stay"],["01:40.31","Wild, child"],
  ["01:44.72","Say you're gonna stay young"],["01:49.27","Don't let 'em steal your peace"],["01:51.04","Say you're gonna stay free"],["01:55.51","Don't let 'em steal your peace"],["01:57.54","Looking at you"],["01:59.14","Looking at me"],["02:00.59","Say you're always gonna be"],["02:03.73","My wild, wild, wildchild"],["02:19.54","Are you having fun, Alex?"],["02:24.59","He's a tough kid"],["02:26.23","You're a tough kid, you know that?"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["wont-go-back-again-alex-warren"] = [
  ["00:13.17","Gone are the days now I'm coming back stronger"],["00:16.25","These kind of scars go deeper than skin"],["00:19.26","Don't make a saint if I stay any longer"],["00:22.32","Been through the dark"],["00:23.47","And I"],["00:25.56","Uh-uh"],["00:26.45","No, I"],["00:28.41","These kind of sins always end in a reckoning"],["00:31.44","Uh, uh-uh"],["00:32.53","No, I"],["00:34.40","These kind of scars go deeper than skin"],["00:37.51","Oh, oh, oh"],["00:39.74","I'm done setting myself on fire just so I can keep you warm"],["00:45.81","I'm done killing my own desires just so I can give you yours"],["00:51.81","You think I'm gon' keep on, keep on, running back to ya like I did before"],["00:57.83","No more, no more, no more"],
  ["01:04.58","Told you all my insecurities"],["01:06.33","It didn't occur to me"],["01:07.75","I was pouring my heart out at the table"],["01:10.47","You'd turn on me"],["01:11.79","You turned on me"],["01:13.48","Said you'd take it your grave"],["01:14.93","Now it's dirt on me"],["01:16.24","I should have known better"],["01:17.97","Back then, I would've sworn it was forever"],["01:21.00","Love/hate, the same thing, different four letters"],["01:23.84","I never thought I'd see this side of you"],["01:26.13","Nothing left to say but \"goodbye\""],["01:28.36","I'm done setting myself on fire just so I can keep you warm"],["01:34.26","I'm done killing my own desires just so I can give you yours"],["01:40.41","You think I'm gon' keep on, keep on, running back to ya like I did before"],["01:46.60","No more, no more, no more"],
  ["02:05.58","Uh, uh-uh"],["02:06.70","No, I"],["02:08.66","Uh, uh-uh"],["02:09.69","No, I"],["02:11.91","Uh-uh"],["02:12.84","No, I"],["02:19.98","I'm done setting myself on fire just so I can keep you warm"],["02:26.10","I'm done killing my own desires just so I can give you yours"],["02:32.19","You think I'm gon' keep on, keep on, running back to ya like I did before"],["02:38.20","No more, no more, no more"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["only-thing-left-alex-warren"] = [
  ["00:08.86","Did we know the ending way before the start?"],["00:16.14","I'm retracing my steps to the night that we met"],["00:20.48","There was fire before there were sparks"],["00:25.72","Are we still pretending that the world is ours?"],["00:32.96","Is the making it work only making things worse?"],["00:37.32","Have we always been two worlds apart?"],["00:42.18","Don't make me let you go"],["00:47.30","We're not out of love"],["00:49.42","We're just out of fight"],["00:51.49","We're watering roses cut from the vine"],["00:55.89","All this time, the only thing left we haven't tried"],["01:04.16","Is calling a cab and cutting the lights"],["01:08.47","Saying we've had the time of our lives"],["01:12.55","In all this time, the only thing left we haven't tried is goodbye"],
  ["01:28.85","Just one last thing, love"],["01:33.08","Can I hold you close?"],["01:36.26","Darling, I'm terrified"],["01:38.31","It might take me a lifetime or two to get over your ghost"],["01:44.69","Oh, don't make me let you go"],["01:50.15","We're not out of love"],["01:52.42","We're just out of fight"],["01:54.66","We're watering roses cut from the vine"],["01:59.04","All this time, the only thing left we haven't tried"],["02:07.31","Is calling a cab and cutting the lights"],["02:11.60","Saying we've had the time of our lives"],["02:15.64","In all this time, the only thing left we haven't tried is goodbye"],
  ["02:28.40","Say the word"],["02:30.49","Turn around"],["02:32.53","So we don't have to do this"],["02:34.82","Not right now"],["02:36.96","All we are is crashing down"],["02:41.12","I don't wanna lose you, I don't know how"],["02:45.24","We're not out of love"],["02:47.31","We're just out of fight"],["02:49.40","We're watering roses cut from the vine"],["02:53.77","All this time, the only thing left we haven't tried"],["03:02.05","Is calling a cab and cutting the lights"],["03:06.32","Saying we've had the time of our lives"],["03:10.34","In all this time, the only thing left we haven't tried is goodbye"]
].map(([time,text])=>[lyricTime(time),text]);

LYRICS["sf-cypher-24"] = [[0,"You caught us, we're still working on getting lyrics for this one."]];

const assetUrl=(value)=>resolveAssetUrl(value, typeof window !== "undefined" ? window.location.href : "");
const ALBUMS_WITH_ASSETS=ALBUMS.map(album=>({...album,artwork:assetUrl(album.artwork)}));
const INITIAL=DEMOS.map(d=>({...d,file:assetUrl(d.file),artwork:assetUrl(d.artwork),demo:true,duration:d.length,url:assetUrl(d.file)}));
const SINGLE_SONG_IDS = new Set(ALBUMS_WITH_ASSETS.filter(album=>album.type==="single").flatMap(album=>album.trackIds||[]));
const STORAGE_KEYS={likes:"dt5_likes",stats:"dt4_stats",sharedPlays:"dt5_shared_plays",livePlays:"dt8_live_plays",highPopularityPlaySchedule:"dt8_high_popularity_play_schedule",recent:"dt6_recent",searches:"dt6_searches",follows:"dt6_follows",playlists:"dt6_playlists",libraryAlbums:"dt7_library_albums",downloads:"dt7_downloads",theme:"dt6_theme",sleep:"dt6_sleep",account:"dt8_account",session:"dt8_session",discord:"dt8_discord",spotify:"dt8_spotify",spotifyProfile:"dt8_spotify_profile",streak:"dt8_streak"};
const SPOTIFY_IMPORT_DEMO={profile:{display_name:"Deluxe Listener",email:"spotify@deluxe.tunes",country:"UK"},playlists:[{name:"Night Drive",tracks:["bad-oneda","let-me-in-oneda","eternity-alex-warren"]},{name:"Late Night Cuts",tracks:["sienna-the-visitor","ufo-d-block-europe-aitch","rain-aitch-aj-tracey"]},{name:"Favourites",tracks:["major-pay-oneda-renee-stormz","clash-dave-stormzy","sienna-you-stole-the-show"]}],likedSongs:["ufo-d-block-europe-aitch","sienna-the-visitor","eternity-alex-warren","major-pay-oneda-renee-stormz"],history:["rain-aitch-aj-tracey","clash-dave-stormzy","sienna-you-stole-the-show","set-it-off-oneda","ufo-d-block-europe-aitch"]};
const safeJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
const isHighPopularityTrack=(song)=>Number(song?.plays||0)>=100000000;
const randomWhole=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const fmt=n=>{n=Math.max(0,Math.floor(n||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`};
const normalizeKey=(value)=>normalizeSpotifyMatchText(value);
const WINDOWS_DOWNLOAD_URL=import.meta.env.VITE_WINDOWS_DOWNLOAD_URL||"https://github.com/remixhubbb-ux/deluxe-tunes/releases/download/v8.1.5/Deluxe-Tunes-Setup.exe";
const APP_VERSION=packageJson.version;
const UPDATE_PAGE_URL="https://deluxetunesapp.pages.dev";
const LATEST_RELEASE_API="https://api.github.com/repos/remixhubbb-ux/deluxe-tunes/releases/latest";
const isNewerVersion=(latest,current)=>{
  const parse=value=>String(value||"").replace(/^v/i,"").split(".").map(part=>Number.parseInt(part,10)||0);
  const latestParts=parse(latest); const currentParts=parse(current);
  return latestParts.some((part,index)=>part>(currentParts[index]||0) || (part<(currentParts[index]||0) && latestParts.slice(0,index).every((item,i)=>item===currentParts[i])));
};

function Logo({compact=false}){return <div className={"logo "+(compact?"compact":"")}><img src={assetUrl("/logo.png")} alt="Deluxe Tunes"/></div>}

function UpdateNotice(){
  const openUpdatePage=()=>window.open(UPDATE_PAGE_URL,"_blank","noopener,noreferrer");
  return <div className="updateNotice" role="status"><button className="updateNoticeLink" onClick={openUpdatePage}><span><Sparkles size={15}/> NEW UPDATE AVAILABLE</span><small>Get the latest Deluxe Tunes <ChevronRight size={15}/></small></button></div>;
}

function Cover({song,size=""}){return <div className={"coverArt "+size} style={{"--a":song.color?.[0]||"#7c3aed","--b":song.color?.[1]||"#06b6d4"}}>{song.artwork ? <img className="coverImage" src={assetUrl(song.artwork)} alt="" /> : null}
  <div className="coverGlow"/>{!song.artwork&&<div className="coverInitial">{song.title?.slice(0,1)}</div>}</div>}

function DevelopmentPreview(){
  return <main className="developmentPreview">
    <div className="developmentGrid" aria-hidden="true"/>
    <div className="developmentGlow developmentGlowOne" aria-hidden="true"/>
    <div className="developmentGlow developmentGlowTwo" aria-hidden="true"/>
    <header className="developmentHeader"><div className="developmentBrand"><img src={assetUrl("/logo.png")} alt=""/><span>DELUXE TUNES</span></div><span className="developmentStatus"><i/> PUBLIC PREVIEW</span></header>
    <section className="developmentContent">
      <div className="developmentEyebrow"><Radio size={14}/> DELUXE TUNES — IN EARLY DEVELOPMENT</div>
      <h1>We're still building<br/><em>the signal.</em></h1>
      <p className="developmentLead">A more thoughtful place for your music is taking shape. The public build is currently <strong>25% complete</strong>.</p>
      <div className="developmentProgress" aria-label="25 percent complete"><div><span>BUILD PROGRESS</span><b>25%</b></div><div className="developmentProgressTrack"><i/></div></div>
      <div className="developmentMeta"><div><span>AVAILABLE SONGS</span><b>{INITIAL.length}</b></div><div><span>RELEASE STATUS</span><b>IN EARLY DEVELOPMENT</b></div><div><span>VERSION</span><b>v{APP_VERSION}</b></div></div>
      <p className="developmentNote"><Sparkles size={15}/> Some songs and features aren't available yet.</p>
      <p className="developmentDisclaimer" style={{borderLeft:"2px solid var(--lime)",padding:"12px 14px",background:"rgba(183,255,60,.07)",color:"#b9c8c7",fontWeight:600,lineHeight:1.7}}>Some features may not work or may look different depending on the device you use. Google sign-in has not been configured properly yet. We are more focused on getting this app out to you guys.<br/><strong style={{color:"var(--lime)",display:"inline-block",marginTop:"5px"}}>— Deluxe Team</strong></p>
      <p style={{maxWidth:"570px",color:"#7f9092",fontSize:"10px",lineHeight:1.65,margin:"0 0 24px"}}><strong style={{color:"#d6e4e1"}}>An account is required to enter.</strong> The only way to make an account is through the app's <strong style={{color:"#d6e4e1"}}>Create account</strong> feature. Don't worry, you can edit your account at any time. If you can't update it now, you can do so later once your device has fully updated to the latest software.</p>
      <div style={{display:"inline-flex",alignItems:"center",gap:"9px",marginBottom:"14px",color:"#718286",font:"800 8px 'Space Grotesk'",letterSpacing:"1.5px"}}><span style={{display:"inline-flex",alignItems:"flex-end",gap:"2px",height:"14px"}}>{[7,11,5,13,9].map((height,index)=><i key={index} style={{display:"block",width:"2px",height:`${height}px`,borderRadius:"2px",background:index%2?"var(--cyan)":"var(--lime)",opacity:.85}}/>)}</span><span>SIGNAL CHECK / ONLINE</span></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",alignItems:"center"}}>
        <button className="developmentEnter" onClick={()=>{window.location.href="/app"}}><Sparkles size={15}/> ENTER PREVIEW <ChevronRight size={17}/></button>
        {WINDOWS_DOWNLOAD_URL&&<a className="developmentDownload" href={WINDOWS_DOWNLOAD_URL}><Download size={15}/> DOWNLOAD FOR WINDOWS</a>}
      </div>
    </section>
    <footer className="developmentFooter"><span>LOCAL MUSIC EXPERIENCE</span><span>DELUXE TUNES v{APP_VERSION} / BUILD 07</span></footer>
  </main>
}

function ComingSoon(){
  return <main className="comingSoon">
    <div className="comingNoise" aria-hidden="true"/>
    <div className="comingOrb comingOrbOne" aria-hidden="true"/>
    <div className="comingOrb comingOrbTwo" aria-hidden="true"/>
    <div className="comingGrid" aria-hidden="true"/>

    <header className="comingHeader">
      <Logo />
      <div className="comingStatus"><span/> PRE-LAUNCH</div>
    </header>

    <section className="comingHero">
      <div className="comingCopy">
        <div className="comingEyebrow"><Crown size={14}/> DELUXE TUNES <b>•</b> COMING SOON</div>
        <h1>Music.<br/><span>Reimagined.</span></h1>
        <p className="comingLead">A new home for your music is almost here. We’re building something made for people who actually love to listen.</p>

        <div className="comingFeatures">
          <div><Music2 size={17}/><span><b>Better sound</b><small>Built around the music</small></span></div>
          <div><Sparkles size={17}/><span><b>Fresh features</b><small>More ways to discover</small></span></div>
          <div><Heart size={17}/><span><b>Your space</b><small>Made to feel personal</small></span></div>
        </div>

        <div className="comingActions">
          <a className="comingPrimary" href="https://mail.google.com/mail/?view=cm&fs=1&to=deluxe.tuness@gmail.com&su=Deluxe%20Tunes%20Launch%20Updates" target="_blank" rel="noreferrer"><span>Get launch updates</span><ChevronRight size={18}/></a>
          <div className="comingMicro"><span className="liveDot"/> DELUXE TUNES IS IN THE WORKS</div>
        </div>
      </div>

      <div className="comingVisual" aria-hidden="true">
        <div className="comingHalo haloA"/>
        <div className="comingHalo haloB"/>
        <div className="comingVinyl">
          <div className="vinylGrooves"/>
          <div className="vinylLabel"><img src={assetUrl("/logo.png")} alt=""/></div>
          <div className="vinylShine"/>
        </div>
        <div className="comingFloating comingFloatingTop"><Zap size={14}/> SOMETHING BIG IS PLAYING</div>
        <div className="comingFloating comingFloatingBottom"><span>01</span> THE NEXT CHAPTER</div>
        <div className="comingSignature">Same vibes.<br/><b>Bigger dreams.</b></div>
      </div>
    </section>

    <footer className="comingFooter"><span>DELUXE TUNES</span><i/> <span>YOUR SOUND. YOUR SPACE.</span><i/> <span>COMING SOON</span></footer>
  </main>
}



async function hashPassword(value){
  if(!window.crypto?.subtle) return value;
  const data=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function makeInitialAccount(){return {id:"local-"+Date.now(),email:"",nickname:"",avatar:"",provider:"email",createdAt:new Date().toISOString()}}
function AccountGate({onAuthenticated}){
  const googleInitialized=useRef(false);
  const [mode,setMode]=useState("signin");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [nickname,setNickname]=useState(""); const [avatar,setAvatar]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const googleClientId=import.meta.env.VITE_GOOGLE_CLIENT_ID;
  function chooseAvatar(e){const file=e.target.files?.[0];if(!file)return; if(file.size>2_000_000){setError("Choose an image under 2 MB.");return;} const reader=new FileReader(); reader.onload=()=>setAvatar(String(reader.result||"")); reader.readAsDataURL(file);}
  async function submit(e){e.preventDefault();setError("");setBusy(true);try{
    const clean=email.trim().toLowerCase(); if(!clean||!password){setError("Enter your email and password.");return;}
    const existing=safeJSON(STORAGE_KEYS.account,null);
    if(mode==="signup"){
      if(existing?.email===clean){setError("An account already exists on this device. Sign in instead.");return;}
      if(password.length<6){setError("Use a password with at least 6 characters.");return;}
      if(!nickname.trim()){setError("Choose a nickname first.");return;}
      const account={...makeInitialAccount(),email:clean,nickname:nickname.trim(),avatar,provider:"email",passwordHash:await hashPassword(password)};
      localStorage.setItem(STORAGE_KEYS.account,JSON.stringify(account));localStorage.setItem(STORAGE_KEYS.session,JSON.stringify(account));onAuthenticated(account);
    }else{
      if(!existing||existing.email!==clean){setError("No account with that email is saved on this device.");return;}
      if(existing.passwordHash!==(await hashPassword(password))){setError("That password is incorrect.");return;}
      localStorage.setItem(STORAGE_KEYS.session,JSON.stringify(existing));onAuthenticated(existing);
    }
  }finally{setBusy(false)}}
  function googleSignIn(){
    setError("");
    if(!googleClientId){setError("Google sign-in needs VITE_GOOGLE_CLIENT_ID to be configured for this app.");return;}
    const start=()=>{
      if(!window.google?.accounts?.id){setError("Google sign-in is still loading. Try again.");return;}
      if(!googleInitialized.current){
        window.google.accounts.id.initialize({client_id:googleClientId,callback:(response)=>{try{const payload=JSON.parse(atob(response.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));const account={...makeInitialAccount(),email:payload.email||"",nickname:payload.name||payload.given_name||"Deluxe Listener",avatar:payload.picture||"",provider:"google"};localStorage.setItem(STORAGE_KEYS.account,JSON.stringify(account));localStorage.setItem(STORAGE_KEYS.session,JSON.stringify(account));onAuthenticated(account)}catch{setError("Google sign-in could not be completed.")}}});
        googleInitialized.current=true;
      }
      window.google.accounts.id.prompt();
    };
    if(window.google?.accounts?.id) start(); else {
      const existing=document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if(existing){existing.addEventListener("load",start,{once:true});}
      else {const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.onload=start;script.onerror=()=>setError("Google sign-in needs an internet connection the first time it is configured.");document.head.appendChild(script);}
    }
  }
  return <div className="authGate"><div className="authGlow"/><div className="authCard"><div className="authBrand"><Logo/><span>DELUXE TUNES</span></div><div className="authCopy"><span>YOUR MUSIC. YOUR ACCOUNT.</span><h1>{mode==="signup"?"Create your account.":"Welcome back."}</h1><p>Sign in to keep your library, likes, playlists, stats and profile together.</p></div><div className="authMethods"><button className="googleBtn" onClick={googleSignIn}><span className="googleMark">G</span> Continue with Google</button><div className="authDivider"><span>OR</span></div></div><form onSubmit={submit} className="authForm">
    {mode==="signup"&&<><label><span>Nickname</span><div className="authInput"><UserRound size={16}/><input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="What should we call you?" autoComplete="nickname"/></div></label><label><span>Profile picture</span><div className="avatarUpload"><div className="authAvatarPreview">{avatar?<img src={avatar} alt="Profile preview"/>:<UserRound size={23}/>}</div><label className="uploadBtn"><Upload size={15}/> Choose photo<input type="file" accept="image/*" onChange={chooseAvatar}/></label><small>Optional · stored on this device</small></div></label></>}
    <label><span>Email</span><div className="authInput"><Mail size={16}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div></label>
    <label><span>Password</span><div className="authInput"><LockKeyhole size={16}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode==="signup"?"new-password":"current-password"}/></div></label>
    {error&&<div className="authError">{error}</div>}<button className="primary authSubmit" disabled={busy}>{busy?"Signing in…":mode==="signup"?"Create account":"Sign in"}</button>
  </form><button className="authSwitch" onClick={()=>{setMode(mode==="signup"?"signin":"signup");setError("")}}>{mode==="signup"?"Already have an account? Sign in":"New to Deluxe Tunes? Create an account"}</button><div className="authFoot"><ShieldCheck size={14}/> Your local account data stays on this device in this offline build.</div></div></div>
}

const resolveApiBase = () => {
  const runtimeBase = typeof window !== 'undefined' && (
    window.__DT_API_BASE__ ||
    window.__DT_OAUTH_BASE__ ||
    window.__DT_CONFIG__?.apiBaseUrl ||
    window.__DT_CONFIG__?.oauthBaseUrl ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_OAUTH_BASE_URL ||
    import.meta.env.VITE_APP_ORIGIN ||
    ''
  );

  if (runtimeBase) return String(runtimeBase).replace(/\/+$/, '');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (origin && origin !== 'null' && !origin.startsWith('file:')) return origin;

  if (typeof window !== 'undefined' && window.location.hostname && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8787';
  }

  return 'https://deluxe-tunes-api.onrender.com';
};
const API_BASE = resolveApiBase();
const BACKEND_ENABLED = true;

function resolveDiscordArtworkUrl(artwork) {
  if (typeof artwork !== "string" || !artwork.trim()) return "deluxetunes";
  const relativePath = artwork.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!relativePath.startsWith("images/")) return "deluxetunes";

  const encodedPath = relativePath.split("/").map(segment => {
    let decodedSegment = segment;
    try { decodedSegment = decodeURIComponent(segment); } catch {}
    return encodeURIComponent(decodedSegment).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  }).join("/");
  if (encodedPath.split("/").some(segment => segment === "." || segment === "..")) return "deluxetunes";
  return `${API_BASE}/${encodedPath}`;
}

function openAuthWindow(url, title = 'deluxeTunesAuth') {
  if (window.electronAPI?.openExternal) {
    try {
      window.electronAPI.openExternal(url);
      return { external: true, closed: false, title };
    } catch (error) {
      console.warn('External browser auth launch failed.', error);
    }
  }

  const features = 'width=520,height=760,noopener,noreferrer';
  try {
    const popup = window.open(url, title, features);
    if (popup && !popup.closed) return popup;
  } catch (error) {
    console.warn('Authentication popup was blocked.', error);
  }

  try {
    const fallback = window.open(url, '_blank', features);
    if (fallback && !fallback.closed) return fallback;
  } catch (error) {
    console.warn('Authentication fallback popup was blocked.', error);
  }

  window.location.assign(url);
  return null;
}

function App(){
  const audio=useRef(null);
  const [account,setAccount]=useState(()=>safeJSON(STORAGE_KEYS.session,null));
  const [discordConnected,setDiscordConnected]=useState(()=>safeJSON(STORAGE_KEYS.discord,false));
  const [discordAuth,setDiscordAuth]=useState(()=>safeJSON("dt8_discord_auth",null));
  const [spotifyConnected,setSpotifyConnected]=useState(()=>safeJSON(STORAGE_KEYS.spotify,false));
  const [spotifyProfile,setSpotifyProfile]=useState(()=>safeJSON(STORAGE_KEYS.spotifyProfile,null));
  const [spotifyAuthState,setSpotifyAuthState]=useState(()=>safeJSON(STORAGE_KEYS.spotify,false)?"connected":"idle");
  // Demo tracks are always restored from /public. Object URLs from uploaded files are
  // intentionally not persisted because blob URLs die when the browser session ends.
  const [songs,setSongs]=useState(INITIAL);
  const [likes,setLikes]=useState(()=>safeJSON(STORAGE_KEYS.likes,[]));
  const [stats,setStats]=useState(()=>safeJSON(STORAGE_KEYS.stats,{}));
  const [sharedPlays,setSharedPlays]=useState(()=>safeJSON(STORAGE_KEYS.sharedPlays,{}));
  const [livePlays,setLivePlays]=useState(()=>safeJSON(STORAGE_KEYS.livePlays,{}));
  const [highPopularityPlaySchedule,setHighPopularityPlaySchedule]=useState(()=>safeJSON(STORAGE_KEYS.highPopularityPlaySchedule,{}));
  const highPopularityPlayScheduleRef=useRef(highPopularityPlaySchedule);
  const [recent,setRecent]=useState(()=>safeJSON(STORAGE_KEYS.recent,[]));
  const [recentSearches,setRecentSearches]=useState(()=>safeJSON(STORAGE_KEYS.searches,[]));
  const [follows,setFollows]=useState(()=>safeJSON(STORAGE_KEYS.follows,[]));
  const [playlists,setPlaylists]=useState(()=>safeJSON(STORAGE_KEYS.playlists,[]));
  const [libraryAlbums,setLibraryAlbums]=useState(()=>safeJSON(STORAGE_KEYS.libraryAlbums,[]));
  const [downloads,setDownloads]=useState(()=>safeJSON(STORAGE_KEYS.downloads,[]));
  const [streak,setStreak]=useState(()=>normalizeStreakState(safeJSON(STORAGE_KEYS.streak,null)));
  const [selectedPlaylist,setSelectedPlaylist]=useState(null);
  const playlistsRef=useRef(playlists);
  useEffect(()=>{playlistsRef.current=playlists},[playlists]);
  useEffect(()=>{setSelectedPlaylist(prev=>prev?playlists.find(p=>p.id===prev.id)||null:null)},[playlists]);
  const [playlistPickerSong,setPlaylistPickerSong]=useState(null);
  const [theme,setTheme]=useState(()=>safeJSON(STORAGE_KEYS.theme,"auto"));
  const [queue,setQueue]=useState([]);
  const [queueOpen,setQueueOpen]=useState(false);
  const [focusMode,setFocusMode]=useState(false);
  const [sleepTimer,setSleepTimer]=useState(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [updateAvailable,setUpdateAvailable]=useState(false);
  const [current,setCurrent]=useState(null),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(0);
  const [volume,setVolume]=useState(.78),[query,setQuery]=useState(""),[page,setPage]=useState("home");
  const [toast,setToast]=useState(""),[shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState(false),[showLyrics,setShowLyrics]=useState(false),[selectedArtist,setSelectedArtist]=useState(null),[selectedAlbum,setSelectedAlbum]=useState(null),[playbackReturnAlbum,setPlaybackReturnAlbum]=useState(null),[libraryTab,setLibraryTab]=useState("playlists"),[previousPage,setPreviousPage]=useState("home");
  const appSessionStartedAt=useRef(Date.now());
  const albumTrackIds=new Set(ALBUMS_WITH_ASSETS.filter(album=>album.type==="album").flatMap(album=>album.trackIds||[]));
  const pageRef=useRef(page);
  const showLyricsRef=useRef(showLyrics);
  useEffect(()=>{pageRef.current=page},[page]);
  useEffect(()=>{showLyricsRef.current=showLyrics},[showLyrics]);

  // Toggle the store/pre-launch screen with VITE_COMING_SOON=true.
  // Normal development builds keep the full Deluxe Tunes player visible.
  const COMING_SOON = import.meta.env.VITE_COMING_SOON === "true";

  useEffect(()=>localStorage.setItem(STORAGE_KEYS.likes,JSON.stringify(likes)),[likes]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.stats,JSON.stringify(stats)),[stats]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.sharedPlays,JSON.stringify(sharedPlays)),[sharedPlays]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.livePlays,JSON.stringify(livePlays)),[livePlays]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.highPopularityPlaySchedule,JSON.stringify(highPopularityPlaySchedule)),[highPopularityPlaySchedule]);
  useEffect(()=>{highPopularityPlayScheduleRef.current=highPopularityPlaySchedule},[highPopularityPlaySchedule]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.recent,JSON.stringify(recent.slice(0,30))),[recent]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.searches,JSON.stringify(recentSearches.slice(0,10))),[recentSearches]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.follows,JSON.stringify(follows)),[follows]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.playlists,JSON.stringify(playlists)),[playlists]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.libraryAlbums,JSON.stringify(libraryAlbums)),[libraryAlbums]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.downloads,JSON.stringify(downloads)),[downloads]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.streak,JSON.stringify(streak)),[streak]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.theme,JSON.stringify(theme)),[theme]);
  useEffect(()=>{
    let cancelled=false;
    fetch(LATEST_RELEASE_API,{headers:{Accept:"application/vnd.github+json"}})
      .then(response=>response.ok?response.json():null)
      .then(release=>{if(!cancelled && isNewerVersion(release?.tag_name,APP_VERSION)) setUpdateAvailable(true)})
      .catch(()=>{});
    return ()=>{cancelled=true};
  },[]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.discord,JSON.stringify(discordConnected)),[discordConnected]);
  useEffect(()=>localStorage.setItem(STORAGE_KEYS.spotify,JSON.stringify(spotifyConnected)),[spotifyConnected]);
  useEffect(()=>{
    if(!spotifyProfile){ localStorage.removeItem(STORAGE_KEYS.spotifyProfile); return; }
    localStorage.setItem(STORAGE_KEYS.spotifyProfile,JSON.stringify(spotifyProfile));
  },[spotifyProfile]);
  useEffect(()=>{
    if(!discordConnected || !discordAuth){ return; }
    const positionSeconds = Number.isFinite(position) ? Math.max(0, position) : 0;
    const durationSeconds = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    const playbackStartedAt = Date.now() - (positionSeconds * 1000);
    const playbackEndedAt = current && durationSeconds > 0 ? Date.now() + Math.max((durationSeconds - positionSeconds), 0) * 1000 : undefined;
    const payload = current ? {
      details: current.title || "Deluxe Tunes",
      state: playing ? "Listening on Deluxe Tunes" : "Paused • Deluxe Tunes",
      largeImageKey: resolveDiscordArtworkUrl(current.artwork),
      largeImageText: "Deluxe Tunes",
      smallImageKey: "deluxe_tunes",
      smallImageText: "Deluxe Tunes",
      startedAt: playbackStartedAt,
      endedAt: playbackEndedAt,
    } : {
      details: "Deluxe Tunes",
      state: "Not playing",
      largeImageKey: "deluxetunes",
      largeImageText: "Deluxe Tunes",
      smallImageKey: "deluxe_tunes",
      smallImageText: "Deluxe Tunes",
      startedAt: Date.now(),
    };
    const bridge = window.DeluxeTunesDiscord;
    if (bridge?.setPresence) {
      bridge.setPresence(payload);
      return;
    }
    if (window.electronAPI?.isElectron) return;
  },[current,playing,position,duration,discordConnected,discordAuth]);

  useEffect(()=>{
    if(!BACKEND_ENABLED) return;
    fetch(`${API_BASE}/api/discord/status`).then(r=>r.ok?r.json():null).then(data=>{
      if(data?.authenticated){ setDiscordAuth(data.user||null); setDiscordConnected(true); localStorage.setItem("dt8_discord_auth",JSON.stringify(data.user||null)); }
      else if(!safeJSON(STORAGE_KEYS.discord,false) || !safeJSON("dt8_discord_auth",null)){ setDiscordAuth(null); setDiscordConnected(false); }
    }).catch(()=>{});
  },[]);
  useEffect(()=>{
    if(!BACKEND_ENABLED) return;
    fetch(`${API_BASE}/api/spotify/status`).then(r=>r.ok?r.json():null).then(data=>{
      if(data?.authenticated){ setSpotifyProfile(data.user||null); setSpotifyConnected(true); setSpotifyAuthState("connected"); }
      else { setSpotifyProfile(null); setSpotifyConnected(false); setSpotifyAuthState("idle"); }
    }).catch(()=>{});
  },[]);
  useEffect(()=>{
    const allowedOrigins = new Set([
      window.location.origin,
      'null',
      'http://localhost:8787',
      'http://127.0.0.1:8787',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://deluxe-tunes-api.onrender.com',
      'https://api.deluxetunes.app',
      new URL(API_BASE).origin,
    ]);
    const onDiscordMessage=(event)=>{
      if(!allowedOrigins.has(event.origin) || event.data?.type!=="deluxe-discord-auth") return;
      if(event.data.ok){
        fetch(`${API_BASE}/api/discord/status`).then(r=>r.json()).then(data=>{
          if(data?.authenticated){setDiscordAuth(data.user||null);setDiscordConnected(true);localStorage.setItem("dt8_discord_auth",JSON.stringify(data.user||null));}
        }).catch(()=>{});
      }
    };
    const onSpotifyMessage=(event)=>{
      if(!allowedOrigins.has(event.origin) || event.data?.type!=="deluxe-spotify-auth") return;
      if(event.data.ok){
        const user = event.data.user || null;
        setSpotifyProfile(user);
        setSpotifyConnected(Boolean(user));
        setSpotifyAuthState(Boolean(user) ? "connected" : "failed");
      } else {
        setSpotifyConnected(false);
        setSpotifyProfile(null);
        setSpotifyAuthState("failed");
      }
    };
    window.addEventListener("message",onDiscordMessage);
    window.addEventListener("message",onSpotifyMessage);
    return()=>{
      window.removeEventListener("message",onDiscordMessage);
      window.removeEventListener("message",onSpotifyMessage);
    };
  },[]);

  const autoNight = new Date().getHours() >= 20 || new Date().getHours() < 7;
  const nightMode = theme === "night" || (theme === "auto" && autoNight);
  useEffect(()=>{ document.documentElement.dataset.theme = nightMode ? "night" : "day"; },[nightMode]);
  useEffect(()=>{
    if(!sleepTimer) return;
    const id=setInterval(()=>setSleepTimer(t=>{ if(!t) return null; return t<=1 ? null : t-1; }),1000);
    return()=>clearInterval(id);
  },[sleepTimer]);
  useEffect(()=>{ if(sleepTimer===1){ const a=audio.current; if(a){ const start=a.volume; const steps=12; let n=0; const fade=setInterval(()=>{ n++; a.volume=Math.max(0,start*(1-n/steps)); if(n>=steps){clearInterval(fade);a.pause();a.volume=start;setPlaying(false);setSleepTimer(null)} },250); return()=>clearInterval(fade); } } },[sleepTimer]);


  const totalSeconds=Object.values(stats).reduce((a,s)=>a+(s.seconds||0),0);
  const totalPlays=Object.values(stats).reduce((a,s)=>a+(s.plays||0),0)+Object.values(livePlays).reduce((a,v)=>a+v,0);
  const streakMilestoneInfo=getStreakMilestoneInfo(streak.current);
  const streakHistory=(Array.isArray(streak.history)?streak.history:[]).slice(0,4);
  const streakCalendar = useMemo(()=>{
    const cells = [];
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 34);
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = getLocalDateKey(cursor);
      cells.push({ key, active: streak.days.includes(key) });
    }
    return cells;
  }, [streak.days]);
  const topSongs=useMemo(()=>[...songs].sort((a,b)=>getEffectivePlayCount(b,stats,livePlays)-getEffectivePlayCount(a,stats,livePlays)).slice(0,5),[songs,stats,livePlays]);
  const albumRecords=useMemo(()=>{
    const orderedAlbumSongs=(album, songList)=>{
      const idMap=new Map(songList.map(song=>[song.id,song]));
      const orderedIds=album.trackIds || [];
      if (orderedIds.length) return orderedIds.map(id => idMap.get(id)).filter(Boolean);
      return songList;
    };
    const custom=ALBUMS_WITH_ASSETS.filter(a=>a.type!=="single").map(a=>({...a,songs:orderedAlbumSongs(a,songs)}));
    const customNames=new Set(custom.map(a=>a.title.toLowerCase()));
    const generated=[...new Map(songs.map(s=>[s.album,s])).values()]
      .filter(a=>a.album && !customNames.has(a.album.toLowerCase()))
      .map(a=>({
        id:`album-${a.album.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
        title:a.album,
        artist:a.artist,
        year:null,
        genre:a.genre,
        artwork:a.artwork,
        trackIds:songs.filter(s=>s.album===a.album).map(s=>s.id),
        songs:orderedAlbumSongs({trackIds:songs.filter(s=>s.album===a.album).map(s=>s.id)}, songs.filter(s=>s.album===a.album))
      }));
    return [...custom,...generated];
  },[songs]);
  // Search is intentionally prefix-based. Albums are not searchable and are never
  // returned here. Songs match their title and artists match their name.
  const searchTerm=query.trim().toLowerCase();
  const filtered=useMemo(()=>{
    if(!searchTerm) return [];
    return songs.filter(s=>String(s.title||"").toLowerCase().startsWith(searchTerm));
  },[songs,searchTerm]);
  const likedSongs=useMemo(()=>songs.filter(s=>likes.includes(s.id)),[songs,likes]);
  const recentlyPlayedSongs=useMemo(()=>recent.map(id=>songs.find(s=>s.id===id)).filter(Boolean),[recent,songs]);
  const queueSongs=queue;
  const filteredArtists=useMemo(()=>{
    if(!searchTerm) return [];
    return ARTISTS.filter(a=>String(a.name||"").toLowerCase().startsWith(searchTerm));
  },[searchTerm]);

  useEffect(()=>{
    const a=audio.current;if(!a)return;
    const onTime=()=>setPosition(a.currentTime||0);
    const onLoaded=()=>{
      if(isFinite(a.duration)){
        setDuration(a.duration);
        setSongs(list=>list.map(x=>x.id===current?.id?{...x,duration:a.duration}:x));
      }
    };
    const onPlay=()=>setPlaying(true);
    const onPause=()=>setPlaying(false);
    const onError=()=>{setPlaying(false);notify("This audio file could not be decoded by your browser.")};
    const onEnd=()=>{setPlaying(false);if(repeat)playSong(current);else next(current,false)};
    a.addEventListener("timeupdate",onTime);
    a.addEventListener("loadedmetadata",onLoaded);
    a.addEventListener("play",onPlay);
    a.addEventListener("pause",onPause);
    a.addEventListener("error",onError);
    a.addEventListener("ended",onEnd);
    return()=>[
      ["timeupdate",onTime],["loadedmetadata",onLoaded],["play",onPlay],
      ["pause",onPause],["error",onError],["ended",onEnd]
    ].forEach(([e,h])=>a.removeEventListener(e,h));
  },[current,repeat,shuffle,songs]);

  function notify(t){setToast(t);clearTimeout(window.__dtToast);window.__dtToast=setTimeout(()=>setToast(""),2100)}

  const streakDayRef=useRef(null);
  useEffect(()=>{
    const a=audio.current;
    if(!a) return;
    const onTimeUpdate=()=>{
      if(!current || a.currentTime < 20) return;
      const dayKey=getLocalDateKey();
      if(streakDayRef.current===dayKey) return;
      streakDayRef.current=dayKey;
      setStreak(prev=>{
        const next = updateStreakForListen(prev, new Date());
        if (next.triggeredMilestones.length) {
          const milestone = next.triggeredMilestones[0];
          notify(`🔥 ${milestone} DAY STREAK • You\'ve listened to Deluxe Tunes for ${milestone} consecutive days.`);
        }
        return next.state;
      });
    };
    a.addEventListener("timeupdate",onTimeUpdate);
    return()=>a.removeEventListener("timeupdate",onTimeUpdate);
  },[current]);

  function recordUniversalPlay(song){
    // Keep play statistics fully local so playback and stats work without a network.
    setSharedPlays(prev=>({...prev,[song.id]:(prev[song.id]||0)+1}));
  }

  function playOrderedQueue(tracks, returnAlbum=null, startSongId=null){
    const ordered=[...new Map((tracks||[]).filter(Boolean).map(song=>[song.id,{...song,url:getSongUrl(song),file:song.file||getSongUrl(song)}])).values()].filter(hasSongAudio);
    if(!ordered.length){ notify("No playable tracks in this selection."); return; }
    const start = ordered.find(song => song.id === startSongId) || ordered[0];
    setQueue(ordered);
    playSong(start, returnAlbum);
  }

  async function playSong(song,returnAlbum=null){
    const resolvedUrl = getSongUrl(song);
    if(!resolvedUrl)return;
    const a=audio.current;
    if(!a)return;
    try{
      a.pause();
      a.src=resolvedUrl;
      a.currentTime=song.startOffset||0;
      a.volume=volume;
      setCurrent(song);
      setRecent(prev=>[song.id,...prev.filter(id=>id!==song.id)].slice(0,30));
      setPosition(0);
      setDuration(song.duration||0);
      const keepLyrics=pageRef.current==="lyrics";
      const lyricsVisible=keepLyrics && showLyricsRef.current;
      if(pageRef.current !== "lyrics") {
        const nextState={dtPage:"lyrics",dtDepth:(Number(window.history.state?.dtDepth||0)+1),selectedArtist:null,selectedAlbum:null,returnAlbum,selectedPlaylistId:null,showLyrics:false};
        window.history.pushState(nextState,"",window.location.href);
        setPage("lyrics");
      }
      setShowLyrics(lyricsVisible || false);
      setPlaybackReturnAlbum(returnAlbum);
      if(keepLyrics){
        window.history.replaceState({...window.history.state,dtPage:"lyrics",showLyrics:lyricsVisible,returnAlbum},"",window.location.href);
      }
      setPlaying(true);
      await a.play();
      setStats(prev=>({...prev,[song.id]:{
        plays:(prev[song.id]?.plays||0)+1,
        seconds:prev[song.id]?.seconds||0
      }}));
      recordUniversalPlay(song);
      notify(`Playing • ${song.title}`);
    }catch(err){
      console.error("Audio playback failed",err);
      setPlaying(false);
      notify("Audio could not start. Check the file and press Play again.");
    }
  }

  function toggle(){
    const a=audio.current;
    if(!current)return playSong(songs[0]);
    if(!a)return;
    if(a.paused)a.play().then(()=>setPlaying(true)).catch(()=>notify("Press Play again to start audio."));
    else {a.pause();setPlaying(false)}
  }

  function crossfadeTo(song){
    const a=audio.current; if(!song)return;
    if(!a||a.paused){playSong(song);return;}
    const start=a.volume; let n=0; const fade=setInterval(()=>{n++;a.volume=Math.max(0,start*(1-n/6));if(n>=6){clearInterval(fade);a.volume=start;playSong(song)}},45);
  }
  function next(from=current,manual=true){
    if(!from)return;
    const queueWithAudio = queue.filter(hasSongAudio);
    if(queueWithAudio.length){ const idx=queueWithAudio.findIndex(s=>s.id===from.id); const candidate=idx>=0 ? queueWithAudio[(idx+1)%queueWithAudio.length] : queueWithAudio[0]; if(candidate){crossfadeTo(candidate);return;} }
    const i=songs.findIndex(s=>s.id===from.id);
    const playableSongs=songs.filter(song=>hasSongAudio(song)&&!albumTrackIds.has(song.id));
    if(!playableSongs.length) return;
    const ni=shuffle?Math.floor(Math.random()*playableSongs.length):(playableSongs.findIndex(s=>s.id===from.id)+1)%playableSongs.length;
    crossfadeTo(playableSongs[ni]);
  }
  function prev(){
    const a=audio.current;
    if(a&&a.currentTime>4){a.currentTime=0;setPosition(0);return}
    if(!current)return;
    const queueWithAudio = queue.filter(hasSongAudio);
    if(queueWithAudio.length){ const idx=queueWithAudio.findIndex(s=>s.id===current.id); const candidate=idx>0 ? queueWithAudio[idx-1] : queueWithAudio[queueWithAudio.length-1]; if(candidate){crossfadeTo(candidate);return;} }
    const playableSongs=songs.filter(song=>hasSongAudio(song)&&!albumTrackIds.has(song.id));
    if(!playableSongs.length) return;
    const i=playableSongs.findIndex(s=>s.id===current.id);
    crossfadeTo(playableSongs[i<0?playableSongs.length-1:(i-1+playableSongs.length)%playableSongs.length]);
  }
  function seekTo(v){const a=audio.current;if(a){a.currentTime=v;setPosition(v)}}
  function addToQueue(song){setQueue(q=>q.some(x=>x.id===song.id)?q:[...q,song]);notify("Added to queue")}
  function removeFromQueue(id){setQueue(q=>q.filter(s=>s.id!==id))}
  function moveQueue(from,to){setQueue(q=>{const next=[...q]; const [item]=next.splice(from,1); next.splice(to,0,item); return next})}
  function clearQueue(){setQueue([]);notify("Queue cleared")}
  useEffect(()=>{queueSongAction=addToQueue; return()=>{queueSongAction=()=>{};}},[queue]);
  function toggleFollow(name){setFollows(v=>v.includes(name)?v.filter(x=>x!==name):[...v,name])}
  function toggleAlbumLibrary(album){
    if(!album?.id)return;
    setLibraryAlbums(v=>v.includes(album.id)?v.filter(id=>id!==album.id):[...v,album.id]);
    notify(libraryAlbums.includes(album.id)?"Removed from Library":"Added to Library");
  }
  function addPlaylist(){
    const input = window.prompt("Playlist name");
    const name = normalizePlaylistName(input);
    if (!name) {
      notify("Playlist name cannot be empty.");
      return;
    }
    if (playlists.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      notify("You already have a playlist with that name.");
      return;
    }
    const nextPlaylist = { id: `playlist-${Date.now()}`, name, songs: [] };
    setPlaylists(p => [nextPlaylist, ...p]);
    setSelectedPlaylist(nextPlaylist);
    notify("Playlist created");
  }
  function addToPlaylist(song,playlistId){
    if(!song)return;
    if(!playlistId){setPlaylistPickerSong(song);return;}
    setPlaylists(ps=>ps.map(p=>p.id===playlistId?{...p,songs:p.songs.includes(song.id)?p.songs:[...p.songs,song.id]}:p));
    setPlaylistPickerSong(null); notify("Added to playlist");
  }
  function removeFromPlaylist(songId,playlistId){setPlaylists(ps=>ps.map(p=>p.id===playlistId?{...p,songs:p.songs.filter(id=>id!==songId)}:p));}
  function editPlaylist(id){const p=playlists.find(x=>x.id===id); if(!p)return; const name=window.prompt("Rename playlist",p.name); if(!name?.trim())return; setPlaylists(ps=>ps.map(x=>x.id===id?{...x,name:name.trim()}:x)); notify("Playlist renamed");}
  function deletePlaylist(id){const p=playlists.find(x=>x.id===id); if(!p)return; if(!window.confirm(`Delete “${p.name}”?`))return; setPlaylists(ps=>ps.filter(x=>x.id!==id)); if(selectedPlaylist?.id===id){setSelectedPlaylist(null);mobileBack()} notify("Playlist deleted");}
  function openPlaylist(playlist){setSelectedPlaylist(playlist);navigate("playlist",{selectedPlaylistId:playlist.id});}
  async function downloadSong(song){
    const resolvedUrl = getSongUrl(song);
    if(!resolvedUrl)return;
    if(downloads.includes(song.id)){
      try{const cache=await caches.open("deluxe-tunes-offline-v1"); await cache.delete(resolvedUrl);}catch{}
      setDownloads(v=>v.filter(id=>id!==song.id)); notify("Removed from Downloads"); return;
    }
    try{
      const isOnline = await isAppOnline();
      const isDownloadAllowed = canDownloadFromOrigin(resolvedUrl, isOnline, window.location.protocol);
      if(!isDownloadAllowed){
        notify("Download is unavailable because this device is offline right now.");
        return;
      }
      if("caches" in window){const cache=await caches.open("deluxe-tunes-offline-v1"); const response=await fetch(resolvedUrl); if(!response.ok)throw new Error("download failed"); await cache.put(resolvedUrl,response.clone());}
      setDownloads(v=>v.includes(song.id)?v:[...v,song.id]); notify("Downloaded for offline playback");
    }catch(err){console.error(err);notify("Download failed. Try again while online.");}
  }
  function toggleLike(id){setLikes(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id])}

  function createSpotifyImportedSong(track, playlistImage=""){
    const title = track?.name || "Unknown track";
    const artist = (track?.artists || []).map(a => a.name).filter(Boolean).join(", ") || "Unknown artist";
    const album = track?.album?.name || "";
    const duration = Number(track?.duration_ms || 0) / 1000;
    const base = `${title} ${artist} ${album}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "spotify-track";
    return {
      id: `spotify-import-${base}-${Math.random().toString(36).slice(2, 9)}`,
      title,
      artist,
      album,
      year: Number(track?.album?.release_date?.slice(0, 4) || new Date().getFullYear()),
      genre: "Spotify Import",
      artwork: track?.album?.images?.[0]?.url || playlistImage || "",
      artistImage: track?.artists?.[0]?.images?.[0]?.url || "",
      file: "",
      url: "",
      length: duration || 0,
      duration: duration || 0,
      bpm: 0,
      custom: true,
      type: "track",
      source: "spotify",
      spotifyTrackId: track?.id || null,
      explicit: Boolean(track?.explicit)
    };
  }

  function matchSongFromSpotify(ref){
    if(!ref) return null;
    if(ref.songId) return songs.find(s=>s.id===ref.songId) || null;
    const track = { title: ref.title || "", artist: ref.artist || "", album: ref.album || "" };
    return matchSpotifyTrackToCatalog(track, songs) || null;
  }

  function importSpotifyPlaylists(){
    if(!spotifyConnected){
      setSpotifyConnected(true);
      setSpotifyProfile({display_name:account?.nickname||"Deluxe Listener",email:account?.email||"spotify@deluxe.tunes",country:"UK"});
    }
    const playlistsToImport = SPOTIFY_IMPORT_DEMO.playlists ?? [];
    setPlaylists(prev=>{
      const next=[...prev];
      playlistsToImport.forEach((playlist,index)=>{
        const resolvedSongs=[...new Set((playlist.tracks||[]).map(track=>matchSongFromSpotify({title:track.title||track,artist:track.artist||""})?.id).filter(Boolean))];
        const existingIndex=next.findIndex(item=>item.name.toLowerCase()===playlist.name.toLowerCase());
        if(existingIndex>=0){
          next[existingIndex]={...next[existingIndex],songs:[...new Set([...(next[existingIndex].songs||[]),...resolvedSongs])]};
        }else{
          next.push({id:`spotify-import-${Date.now()}-${index}`,name:playlist.name,songs:resolvedSongs});
        }
      });
      return next;
    });
    notify("Spotify playlists imported into your Library");
  }

  function importSpotifyLikedSongs(){
    if(!spotifyConnected){
      setSpotifyConnected(true);
      setSpotifyProfile({display_name:account?.nickname||"Deluxe Listener",email:account?.email||"spotify@deluxe.tunes",country:"UK"});
    }
    const ids=(SPOTIFY_IMPORT_DEMO.likedSongs||[])
      .map(item=>matchSongFromSpotify(typeof item === "string" ? {title:item} : item)?.id)
      .filter(Boolean);
    setLikes(prev=>[...new Set([...prev,...ids])]);
    notify("Spotify liked songs imported");
  }

  function extractSpotifyTrackFromEntry(entry){
    if(!entry || typeof entry !== "object") return null;
    const rawItem = entry.item ?? entry.track ?? entry;
    const nestedTrack = rawItem && typeof rawItem === "object" && rawItem.track && typeof rawItem.track === "object" ? rawItem.track : rawItem;
    const track = nestedTrack && typeof nestedTrack === "object" ? nestedTrack : null;
    if(!track) return null;
    if(track.type && track.type !== "track") return null;
    return track;
  }

  async function importSpotifyPlaylist(spotifyPlaylist, customName){
    if(!spotifyPlaylist?.id) return {imported:0,total:0,unmatched:0,created:false,error:"Playlist not found."};
    try{
      const r=await fetch(`${API_BASE}/api/spotify/playlists/${encodeURIComponent(spotifyPlaylist.id)}/items`, { cache: "no-store" });
      const payload=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(payload?.error || "Spotify playlist items could not be loaded.");
      const playlistItems=Array.isArray(payload.items) ? payload.items : [];
      const finalIds=[];
      const importedSongs=[];
      const seenIds=new Set();
      const unmatched=[];
      const seenKeys=new Set();
      playlistItems.forEach((entry)=>{
        const track = extractSpotifyTrackFromEntry(entry);
        if(!track || (track.type && track.type !== "track")) return;
        const title = track.name || "Unknown track";
        const artist = (track.artists || []).map(a => a.name).filter(Boolean).join(", ") || "Unknown artist";
        const album = track.album?.name || "";
        const match = matchSongFromSpotify({ title, artist, album });
        const dedupeKey = match ? match.id : `${normalizeKey(title)}|${normalizeKey(artist)}`;
        if(match && !seenIds.has(match.id)){
          seenIds.add(match.id);
          finalIds.push(match.id);
        }else if(!seenKeys.has(dedupeKey)){
          seenKeys.add(dedupeKey);
          const importedSong = createSpotifyImportedSong(track, spotifyPlaylist.image || "");
          importedSongs.push(importedSong);
          finalIds.push(importedSong.id);
          unmatched.push({ title, artist, album });
        }
      });
      if(importedSongs.length){
        setSongs(prev => {
          const existingIds = new Set(prev.map(song => song.id));
          const unique = importedSongs.filter(song => !existingIds.has(song.id));
          return unique.length ? [...prev, ...unique] : prev;
        });
      }
      const finalName=(customName || spotifyPlaylist.name || "Spotify Playlist").trim() || "Spotify Playlist";
      const existingName = playlists.some(p => p.name.toLowerCase() === finalName.toLowerCase());
      const playlistName = existingName ? `${finalName} (Spotify)` : finalName;
      setPlaylists(prev => [...prev, {id:`spotify-import-${Date.now()}`,name:playlistName,songs:finalIds,artwork:spotifyPlaylist.image || null}]);
      return { imported: finalIds.length, total: playlistItems.length, unmatched: unmatched.length, unmatchedTracks: unmatched.slice(0,10), created: true, name: playlistName };
    }catch(err){
      console.error("Spotify playlist import failed", err);
      return { imported: 0, total: 0, unmatched: 0, created: false, error: err?.message || "Could not import playlist." };
    }
  }

  function importSpotifyHistory(){
    if(!spotifyConnected){
      setSpotifyConnected(true);
      setSpotifyProfile({display_name:account?.nickname||"Deluxe Listener",email:account?.email||"spotify@deluxe.tunes",country:"UK"});
    }
    const ids=(SPOTIFY_IMPORT_DEMO.history||[])
      .map(item=>matchSongFromSpotify(typeof item === "string" ? {title:item} : item)?.id)
      .filter(Boolean);
    setRecent(prev=>[...new Set([...ids,...prev])].slice(0,30));
    setStats(prev=>{
      const next={...prev};
      ids.forEach(id=>{
        next[id]={
          plays:(next[id]?.plays||0)+1,
          seconds:next[id]?.seconds||0
        };
      });
      return next;
    });
    notify("Spotify listening history imported");
  }

  useEffect(()=>{if(audio.current)audio.current.volume=volume},[volume]);

  useEffect(()=>{
    const timer=setInterval(()=>{
      setLivePlays(prev => {
        const next = {...prev};
        for (const song of songs) {
          const bump = Math.floor(Math.random() * 2) + 1;
          next[song.id] = (next[song.id] || 0) + bump;
        }
        return next;
      });
    }, 60 * 60 * 1000);
    return ()=>clearInterval(timer);
  }, [songs]);

  useEffect(()=>{
    const now=Date.now();
    setHighPopularityPlaySchedule(prev=>{
      const next={...prev};
      songs.filter(isHighPopularityTrack).forEach(song=>{
        const existing=next[song.id];
        if(!existing || !Number.isFinite(existing.nextFiveMinuteAt) || !Number.isFinite(existing.nextBurstAt)){
          next[song.id]={
            nextFiveMinuteAt:now+5*60*1000,
            nextBurstAt:now+randomWhole(10,15)*60*1000
          };
        }
      });
      return next;
    });

    const timer=setInterval(()=>{
      const currentTime=Date.now();
      const dueCounts={};
      const next={...highPopularityPlayScheduleRef.current};
      songs.filter(isHighPopularityTrack).forEach(song=>{
        const existing=next[song.id]||{
          nextFiveMinuteAt:currentTime+5*60*1000,
          nextBurstAt:currentTime+randomWhole(10,15)*60*1000
        };
        let fiveMinuteAt=Number(existing.nextFiveMinuteAt);
        let burstAt=Number(existing.nextBurstAt);
        let count=0;
        while(fiveMinuteAt<=currentTime&&count<288){
          dueCounts[song.id]=(dueCounts[song.id]||0)+1;
          fiveMinuteAt+=5*60*1000;
          count++;
        }
        if(burstAt<=currentTime){
          dueCounts[song.id]=(dueCounts[song.id]||0)+randomWhole(3,5);
          burstAt=currentTime+randomWhole(10,15)*60*1000;
        }
        next[song.id]={nextFiveMinuteAt:fiveMinuteAt,nextBurstAt:burstAt};
      });
      highPopularityPlayScheduleRef.current=next;
      setHighPopularityPlaySchedule(next);
      if(Object.keys(dueCounts).length){
        setLivePlays(prev=>{
          const updated={...prev};
          Object.entries(dueCounts).forEach(([id,count])=>{updated[id]=(updated[id]||0)+count});
          return updated;
        });
      }
    },30*1000);
    return()=>clearInterval(timer);
  },[songs]);

  useEffect(()=>{
    if(!playing||!current)return;
    const timer=setInterval(()=>{
      setStats(prev=>({...prev,[current.id]:{
        plays:prev[current.id]?.plays||0,
        seconds:(prev[current.id]?.seconds||0)+1
      }}));
    },1000);
    return()=>clearInterval(timer);
  },[playing,current?.id]);


  useEffect(()=>{
    const onKey=(e)=>{
      if(e.target instanceof HTMLInputElement)return;
      if(e.code==="Space"){e.preventDefault();toggle()}
      if(e.code==="ArrowRight"&&audio.current)seekTo(Math.min(duration,audio.current.currentTime+5));
      if(e.code==="ArrowLeft"&&audio.current)seekTo(Math.max(0,audio.current.currentTime-5));
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[duration,current]);


  useEffect(()=>{
    const initial=window.history.state;
    const isStaleLyricsRoute = initial?.dtPage === "lyrics";
    if(!initial?.dtPage){
      window.history.replaceState({dtPage:page,dtDepth:0},"",window.location.href);
    } else if(isStaleLyricsRoute){
      setPage("home");
      setShowLyrics(false);
      setPlaybackReturnAlbum(null);
      window.history.replaceState({dtPage:"home",dtDepth:0},"",window.location.href);
    }
    const onPop=(event)=>{
      const state=event.state;
      if(!state?.dtPage){
        setSelectedArtist(null); setSelectedAlbum(null); setSelectedPlaylist(null); setPage("home"); setShowLyrics(false);
        return;
      }
      setSelectedArtist(state.selectedArtist||null);
      setSelectedAlbum(state.selectedAlbum||null);
      setPlaybackReturnAlbum(state.returnAlbum||null);
      setSelectedPlaylist(state.selectedPlaylistId?playlistsRef.current.find(p=>p.id===state.selectedPlaylistId)||null:null);
      setPage(state.dtPage);
      setShowLyrics(Boolean(state.showLyrics));
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  if(COMING_SOON) return <ComingSoon/>;
  if(!account) return <AccountGate onAuthenticated={setAccount}/>;

  function navigate(next,extra={}){
    const depth=Number(window.history.state?.dtDepth||0)+1;
    const state={dtPage:next,dtDepth:depth,selectedArtist:null,selectedAlbum:null,returnAlbum:null,selectedPlaylistId:null,showLyrics:false,...extra};
    window.history.pushState(state,"",window.location.href);
    setPreviousPage(page); setPage(next);
    setSelectedArtist(state.selectedArtist||null); setSelectedAlbum(state.selectedAlbum||null); setSelectedPlaylist(state.selectedPlaylistId?playlistsRef.current.find(p=>p.id===state.selectedPlaylistId)||null:null);
    setPlaybackReturnAlbum(state.returnAlbum||null);
    setShowLyrics(Boolean(state.showLyrics));
  }
  function goPage(next){ navigate(next); }
  function openArtist(name){ navigate("artist-profile",{selectedArtist:name}); }
  function openAlbum(album){ navigate("album",{selectedAlbum:album}); }
  function playAlbum(album,returnAlbum=null){
    const ordered = album?.songs?.length ? album.songs : songs.filter(s=>album.trackIds?.includes(s.id));
    playOrderedQueue(ordered, returnAlbum || album, ordered[0]?.id);
  }
  function openLyrics(){
    if(page === "lyrics"){
      const next=!showLyrics; setShowLyrics(next);
      window.history.replaceState({...window.history.state,showLyrics:next},"",window.location.href);
      return;
    }
    navigate("lyrics",{showLyrics:true});
  }
  function mobileBack(){
    if(Number(window.history.state?.dtDepth||0)>0) window.history.back();
    else { setPage("home"); setSelectedArtist(null); setSelectedAlbum(null); setSelectedPlaylist(null); setShowLyrics(false); }
  }
  function signOut(){ localStorage.removeItem(STORAGE_KEYS.session); setSettingsOpen(false); setAccount(null); setCurrent(null); setPlaying(false); }

  const nav=[["home","Home",Home],["search","Search",Search],["library","Your Library",Library],["artists","Artists",Users],["stats","Your Stats",BarChart3]];

  return <div className="app">
    <aside className="side"><Logo/>
      <div className="navGroup">{nav.map(([id,label,I])=><button className={page===id?"nav active":"nav"} onClick={()=>goPage(id)} key={id}><I size={19}/><span>{label}</span></button>)}</div>
      <div className="sideFooter">
        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=deluxe.tuness@gmail.com" target="_blank" rel="noreferrer"><Mail size={15}/><span>Contact support</span></a>
        <small>Deluxe Tunes v{APP_VERSION}</small>
      </div>
    </aside>

    <main><header className="topbar"><div className="mobileLogo"><Logo compact/></div>
      {page!=="search"&&<div className="topbarSpacer"/>}
      <div className="headerActions"><button className="avatar accountAvatar" onClick={()=>setSettingsOpen(true)} aria-label="Open account and settings">{account.avatar?<img src={account.avatar} alt=""/>:String(account.nickname||"DT").slice(0,2).toUpperCase()}</button></div>
    </header>
      {page==="home"&&updateAvailable&&<UpdateNotice/>}
      {page==="home"&&<HomePage current={current} songs={songs} topSongs={topSongs} recentSongs={recentlyPlayedSongs} likes={likes} play={playSong} playAlbum={playAlbum} like={toggleLike} addToPlaylist={addToPlaylist} downloadSong={downloadSong} downloads={downloads} goStats={()=>goPage("stats")} goSearch={()=>goPage("search")} openArtist={openArtist} openAlbum={openAlbum} follows={follows}/>} 
      {page==="search"&&<SearchPage songs={filtered} artists={filteredArtists} likes={likes} play={playSong} like={toggleLike} query={query} setQuery={setQuery} back={mobileBack} openArtist={openArtist} recentSearches={recentSearches} setRecentSearches={setRecentSearches} addToPlaylist={addToPlaylist} downloads={downloads} downloadSong={downloadSong}/>}
      {page==="library"&&<LibraryPage songs={songs} albums={albumRecords} libraryAlbums={libraryAlbums} toggleAlbumLibrary={toggleAlbumLibrary} likes={likes} play={playSong} like={toggleLike} addToPlaylist={addToPlaylist} downloads={downloads} downloadSong={downloadSong} tab={libraryTab} setTab={setLibraryTab} openArtist={openArtist} openAlbum={openAlbum} playlists={playlists} addPlaylist={addPlaylist} openPlaylist={openPlaylist} editPlaylist={editPlaylist} deletePlaylist={deletePlaylist} follows={follows}/>} 
      {page==="artists"&&<ArtistsPage songs={songs} openArtist={openArtist} follows={follows} toggleFollow={toggleFollow}/>}
      {page==="artist-profile"&&<ArtistProfile artist={selectedArtist} songs={songs} stats={stats} livePlays={livePlays} likes={likes} play={playSong} like={toggleLike} addToPlaylist={addToPlaylist} back={mobileBack} openAlbum={openAlbum} follows={follows} toggleFollow={toggleFollow} downloads={downloads} downloadSong={downloadSong} playOrderedQueue={playOrderedQueue}/>} 
      {page==="album"&&<AlbumPage album={selectedAlbum} songs={songs} stats={stats} sharedPlays={sharedPlays} likes={likes} play={playSong} like={toggleLike} playAlbum={playAlbum} back={mobileBack} libraryAlbums={libraryAlbums} toggleAlbumLibrary={toggleAlbumLibrary} addToPlaylist={addToPlaylist} downloads={downloads} downloadSong={downloadSong}/>}
      {page==="playlist"&&<PlaylistPage playlist={selectedPlaylist} songs={songs} likes={likes} play={playSong} like={toggleLike} addToPlaylist={addToPlaylist} removeFromPlaylist={removeFromPlaylist} editPlaylist={editPlaylist} deletePlaylist={deletePlaylist} downloads={downloads} downloadSong={downloadSong} back={mobileBack}/>}
      {page==="lyrics"&&<LyricsPage songs={songs} current={current} position={position} play={playSong} showLyrics={showLyrics} setShowLyrics={setShowLyrics} back={mobileBack} backLabel={playbackReturnAlbum?`Back To ${playbackReturnAlbum.title}`:"Back"} queueSongs={queueSongs} queueOpen={queueOpen} setQueueOpen={setQueueOpen} addToQueue={addToQueue} removeFromQueue={removeFromQueue} moveQueue={moveQueue} focusMode={focusMode} setFocusMode={setFocusMode} next={next} prev={prev}/>}
      {page==="stats"&&<StatsPage songs={songs} stats={stats} livePlays={livePlays} seconds={totalSeconds} plays={totalPlays} back={mobileBack} play={playSong} like={toggleLike} likes={likes} addToPlaylist={addToPlaylist} downloads={downloads} downloadSong={downloadSong}/>}
    </main>

    <div className="playerBar">
      <div className="playerMainRow">
        <div className="playerLeft">
          {current ? <>
            <button className="playerArtworkButton" onClick={()=>navigate("lyrics",{showLyrics:false})} aria-label="Open now playing"><Cover song={current}/></button>
            <div className="playerDesktopProgress" aria-label="Playback progress" title={duration ? `${fmtDuration(position)} / ${fmtDuration(duration)}` : "Playback progress"}>
              <span className="playerDesktopProgressFill" style={{width: `${duration ? Math.min((position / duration) * 100, 100) : 0}%`}} />
            </div>
            <div className="playerMeta">
              <div className="npText">
                <b>{current.title}</b>
                <span>{current.artist} • {current.genre}</span>
              </div>
              <div className="mobileMiniActions" aria-label="Mobile player actions">
                <button
                  className={likes.includes(current.id) ? "mobileMiniAction liked" : "mobileMiniAction"}
                  onClick={(e)=>{e.stopPropagation();toggleLike(current.id)}}
                  aria-label={likes.includes(current.id) ? "Remove from Liked Songs" : "Add to Liked Songs"}
                  title={likes.includes(current.id) ? "Remove from Liked Songs" : "Add to Liked Songs"}
                >
                  <Heart size={15} fill={likes.includes(current.id) ? "currentColor" : "none"}/>
                </button>
                <button
                  className={showLyrics ? "mobileMiniAction active" : "mobileMiniAction"}
                  onClick={(e)=>{e.stopPropagation();openLyrics()}}
                  aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
                  title={showLyrics ? "Hide lyrics" : "Show lyrics"}
                >
                  <Mic2 size={15}/>
                </button>
              </div>
              <div className={playing ? "miniWave live" : "miniWave"}>{[1,2,3,4,5,6,7].map(i=><i key={i}/>)}</div>
            </div>
          </> : <div className="waiting"><Headphones size={20}/><span>Pick a track and press play — real audio is ready.</span></div>}
        </div>

        <div className="playerCenter">
          <div className="transport">
            <button className={shuffle?"on":""} onClick={()=>setShuffle(!shuffle)} title="Shuffle"><Shuffle size={14}/></button>
            <button onClick={prev} title="Previous"><SkipBack size={17} fill="currentColor"/></button>
            <button className="mainPlay" onClick={toggle} aria-label={playing?"Pause playback":"Play playback"} title={playing?"Pause":"Play"}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button>
            <button onClick={()=>next()} title="Next"><SkipForward size={17} fill="currentColor"/></button>
            <button className={repeat?"on":""} onClick={()=>setRepeat(!repeat)} title="Repeat"><Repeat2 size={14}/></button>
          </div>
        </div>

        <div className="playerActions">
          <div className="volumeControl">
            <button className="volumeButton" onClick={()=>setVolume(volume>0?0:.78)} aria-label={volume>0?"Mute volume":"Unmute volume"} title={volume>0?"Mute volume":"Unmute volume"}>{volume>0?<Volume2 size={16}/>:<VolumeX size={16}/>}</button>
            <input className="volumeSlider" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))} aria-label="Volume"/>
          </div>
          <button className={showLyrics ? "lyricsBtn playerLyricsBtn active" : "lyricsBtn playerLyricsBtn"} onClick={openLyrics} aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"} title={showLyrics ? "Hide lyrics" : "Show lyrics"}><Mic2 size={15}/></button>
          <button className="queueButton" onClick={()=>setQueueOpen(open=>!open)} title={queueOpen?"Close queue":"Queue"}><ListOrdered size={16}/><span>Queue</span></button>
          <PlayerMoreMenu song={current} addToPlaylist={addToPlaylist} addToQueue={addToQueue} liked={current?likes.includes(current.id):false} onLike={toggleLike} onQueue={()=>setQueueOpen(true)} volume={volume} setVolume={setVolume} />
        </div>
      </div>
    </div>

    {queueOpen&&<QueuePanel songs={songs} queueSongs={queueSongs} current={current} likes={likes} like={toggleLike} addToPlaylist={addToPlaylist} downloads={downloads} downloadSong={downloadSong} onClose={()=>setQueueOpen(false)} removeFromQueue={removeFromQueue} moveQueue={moveQueue} addToQueue={addToQueue} play={playSong} clearQueue={clearQueue}/>} 
    {playlistPickerSong&&<PlaylistPicker song={playlistPickerSong} playlists={playlists} addPlaylist={addPlaylist} addToPlaylist={addToPlaylist} onClose={()=>setPlaylistPickerSong(null)}/>}
    {settingsOpen&&<SettingsPanel account={account} setAccount={setAccount} theme={theme} setTheme={setTheme} discordConnected={discordConnected} setDiscordConnected={setDiscordConnected} discordAuth={discordAuth} setDiscordAuth={setDiscordAuth} spotifyConnected={spotifyConnected} setSpotifyConnected={setSpotifyConnected} spotifyProfile={spotifyProfile} setSpotifyProfile={setSpotifyProfile} spotifyAuthState={spotifyAuthState} setSpotifyAuthState={setSpotifyAuthState} matchSongFromSpotify={matchSongFromSpotify} extractSpotifyTrackFromEntry={extractSpotifyTrackFromEntry} onImportSpotifyPlaylists={importSpotifyPlaylists} onImportSpotifyLikedSongs={importSpotifyLikedSongs} onImportSpotifyHistory={importSpotifyHistory} onImportSpotifyPlaylist={importSpotifyPlaylist} onSignOut={signOut} onClose={()=>setSettingsOpen(false)} sleepTimer={sleepTimer} setSleepTimer={setSleepTimer} streak={streak} streakMilestoneInfo={streakMilestoneInfo} streakHistory={streakHistory} streakCalendar={streakCalendar}/>}
    <audio ref={audio} preload="metadata"/>
    {toast&&<div className="toast">{toast}</div>}
  </div>
}

function HomePage({current,songs,topSongs,recentSongs,likes,play,playAlbum,like,addToPlaylist,downloadSong,downloads,goStats,goSearch,openArtist,openAlbum,follows}){
 const newestSongs=songs.slice().reverse();
 const newestPair=newestSongs.slice(0,2);
 const sourceAlbum=newestPair.length?ALBUMS.find(album=>album.trackIds?.some(id=>newestPair.some(song=>song.id===id))):null;
 const generatedAlbum=!sourceAlbum&&newestPair[0]?.album?{id:`album-${newestPair[0].album.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,title:newestPair[0].album,artist:newestPair[0].artist,genre:newestPair[0].genre,artwork:newestPair[0].artwork,trackIds:songs.filter(song=>song.album===newestPair[0].album).map(song=>song.id)}:null;
 const recentAlbum=(sourceAlbum||generatedAlbum)&&{...(sourceAlbum||generatedAlbum),songs:songs.filter(song=>(sourceAlbum?.trackIds||[]).includes(song.id)||song.album===(sourceAlbum||generatedAlbum).title)};
 const badSingle=ALBUMS.find(album=>album.id==="bad-oneda-single");
 const albumTrackIds=new Set(recentAlbum?.trackIds||[]);
 const otherSongs=newestSongs.filter(song=>!albumTrackIds.has(song.id)&&song.id!=="bad-oneda");
 const locationSong=songs.find(song=>song.id==="location-dave-burna-boy");
 const recentSongFallbacks=otherSongs.filter(song=>song.id!=="location-dave-burna-boy");
 const recentlyAdded=[
   locationSong&&{kind:"song",value:locationSong},
   recentAlbum&&{kind:"album",value:recentAlbum},
   badSingle&&{kind:"album",value:badSingle},
   ...recentSongFallbacks.slice(0,2).map(song=>({kind:"song",value:song}))
 ].filter(Boolean).slice(0,5);
 const wildchildAlbum=ALBUMS.find(album=>album.id==="wildchild-alex-warren");
 const wakeUpSingle=ALBUMS.find(album=>album.id==="when-i-wake-up-christian-gate-single");
 const latestFeatured=wakeUpSingle?{...wakeUpSingle,album:wakeUpSingle.title,songs:songs.filter(song=>wakeUpSingle.trackIds.includes(song.id))}:wildchildAlbum?{...wildchildAlbum,album:wildchildAlbum.title,songs:songs.filter(song=>wildchildAlbum.trackIds.includes(song.id))}:newestSongs[0]||recentAlbum||badSingle||songs[0];
 const latestIsAlbum=Boolean(!wakeUpSingle&&wildchildAlbum&&latestFeatured.id===wildchildAlbum.id);
 return <section className="page homeRedesign">
  <HomeEditorial current={latestFeatured} latestIsAlbum={latestIsAlbum} songs={songs} likes={likes} follows={follows} play={play} playAlbum={playAlbum} openAlbum={openAlbum} goSearch={goSearch} goStats={goStats}/>
  <div className="homeSectionHead recentlyAddedHead"><div><span>NEW ARRIVALS</span><h2>New Arrivals.</h2></div><button onClick={goSearch}>Browse all <ChevronRight size={14}/></button></div>
  {recentlyAdded.length?<div className="cards homeRail recentlyAddedRail">{recentlyAdded.map(item=>item.kind==="album"?<AlbumCard key={item.value.id} album={item.value} onOpen={()=>openAlbum(item.value)}/>:<Card key={item.value.id} song={item.value} liked={likes.includes(item.value.id)} play={play} like={like} addToPlaylist={addToPlaylist} downloaded={downloads?.includes(item.value.id)} downloadSong={downloadSong}/>)}</div>:<div className="empty compactEmpty"><Music2 size={28}/><b>Your next favorite is waiting.</b><span>Search for music to start building your collection.</span></div>}
 </section>
}
function HomeEditorial({current,latestIsAlbum,songs,likes,follows,play,playAlbum,openAlbum,goSearch,goStats}){
  const palette=current?.color||["#31545a","#111820"];
  const deluxeAlbumUrl = assetUrl("/images/deluxe-tunes-album.png");
  const isWakeUpSingle=current?.id==="when-i-wake-up-christian-gate-single";

  return <section className="homeEditorial deluxeWelcome" style={{"--accent-a":palette[0],"--accent-b":palette[1]}}>
    <div className="welcomeLeft">
      <div className="welcomeEyebrow">WELCOME TO</div>
      <h1 className="welcomeTitle">
        <span>Deluxe Tunes</span>
        <span className="welcomeSoundwave" aria-hidden="true">
          {[0,1,2,3,4,5,6,7,8,9,10,11,12].map((bar) => (
            <i key={bar} style={{height: `${8 + ((bar % 6) * 7)}px`}} />
          ))}
        </span>
      </h1>
      <p className="welcomeText">Your music, your way. Discover, stream and vibe with Deluxe Tunes.</p>

      <div className="welcomeArtworkWrap">
        <div className="welcomeArtworkFrame">
          <div className="welcomeVinylPeek" aria-hidden="true" />
          <img src={deluxeAlbumUrl} alt="Deluxe Tunes album art" />
          <div className="welcomeArtworkGlow" aria-hidden="true" />
        </div>
      </div>
    </div>

    <div className="welcomePanel">
      <div className="welcomePanelBadge">WELCOME ABOARD</div>
      <h2>Thanks for joining Deluxe Tunes!</h2>
      <p>We’re so glad you’re here. Deluxe Tunes is still in development, and every day we’re working to make your experience even better.</p>
      <p>Right now, you might notice some features are still being polished, but rest assured — we’re constantly improving, adding new features, and listening to your feedback.</p>
      <p>Stay tuned for big updates, exciting new features, and huge changes that will take your music experience to the next level.</p>

      <button className="welcomeStudioButton" onClick={goStats}>
        <span className="welcomeStudioIcon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18V6M8 18V10M12 18V8M16 18V12M20 18V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        Deluxe Tunes Studio
      </button>

      <div className="welcomeFeatureGrid">
        <div className="welcomeFeatureCard">
          <div className="welcomeFeatureIcon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 18V7.5C8 6.12 9.12 5 10.5 5C11.88 5 13 6.12 13 7.5V18M13 10.5C13 9.12 14.12 8 15.5 8C16.88 8 18 9.12 18 10.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 18H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></div>
          <h3>More Music</h3>
          <p>We’re adding more artists, genres and playlists.</p>
        </div>
        <div className="welcomeFeatureCard">
          <div className="welcomeFeatureIcon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3L18 3L13 9H18L12 21L11 15H6L13 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <h3>Better Performance</h3>
          <p>Faster, smoother and more reliable.</p>
        </div>
        <div className="welcomeFeatureCard">
          <div className="welcomeFeatureIcon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <h3>Exciting Features</h3>
          <p>New tools, customisation and more.</p>
        </div>
      </div>
    </div>
  </section>
}
function LandingHero({latest,latestIsAlbum,songs,likes,follows,play,openAlbum,goSearch,goStats}){
  function movePointer(event){const rect=event.currentTarget.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width;const y=(event.clientY-rect.top)/rect.height;event.currentTarget.style.setProperty("--pointer-x",`${x*100}%`);event.currentTarget.style.setProperty("--pointer-y",`${y*100}%`);event.currentTarget.style.setProperty("--tilt-x",`${(y-.5)*-3}deg`);event.currentTarget.style.setProperty("--tilt-y",`${(x-.5)*3}deg`)}
  return <section className="workbenchHero" onPointerMove={movePointer} onPointerLeave={event=>{event.currentTarget.style.setProperty("--pointer-x","50%");event.currentTarget.style.setProperty("--pointer-y","50%");event.currentTarget.style.setProperty("--tilt-x","0deg");event.currentTarget.style.setProperty("--tilt-y","0deg")}}>
    <header className="workbenchTop"><span className="workbenchBrand"><img src={assetUrl("/logo.png")} alt=""/> DELUXE TUNES</span><span className="workbenchMode">AUDIO WORKBENCH <i/></span><span className="workbenchMeta">LOCAL LIBRARY&nbsp;&nbsp; / &nbsp;&nbsp;DT//06</span><button onClick={goSearch}>Open library <ChevronRight size={14}/></button></header>
    <div className="workbenchGrid"><aside className="workbenchRail"><span className="railIndex">01</span><b>NOW<br/>PLAYING</b><div className="railRule"/><span className="railCaption">AUDIO<br/>ENGINE<br/>READY</span><button onClick={goStats}><BarChart3 size={16}/><small>PROFILE</small></button></aside>
      <main className="workbenchCenter"><div className="albumStage" style={{"--stage-art":`url(${latest?.artwork||"/images/location-dave-burna-boy.jpg"})`}}><div className="albumAtmosphere"/><div className="albumReflection"/><div className="albumHeroArtwork"><Cover song={latest}/><span>01 / FEATURED LISTEN</span></div><div className="albumStageMark">DELUXE<br/><em>TUNES</em></div><div className="stageLine stageLineA"/><div className="stageLine stageLineB"/></div><div className="trackIdentity"><div><span>NOW PLAYING</span><h1>{latest?.title||"Choose a track"}</h1><p>{latest?.artist||"Deluxe Tunes"} <b>·</b> {latest?.album||"Local library"}</p></div><button onClick={()=>latestIsAlbum?openAlbum(latest):latest&&play(latest)} className="identityPlay" aria-label="Play current track"><Play size={18} fill="currentColor"/></button></div><div className="waveTransport"><div className="waveTimeline">{Array.from({length:54},(_,i)=><i key={i} style={{"--wave-h":`${12+(i%9)*4}px`}}/>)}<span/></div><div className="transportMeta"><span>0:00</span><b>03:54</b></div><div className="transportControls"><button><SkipBack size={15}/></button><button className="transportMain" onClick={()=>latest&&play(latest)}><Play size={15} fill="currentColor"/></button><button><SkipForward size={15}/></button><button onClick={goSearch}><Search size={14}/></button></div></div></main>
      <aside className="profileRail"><span className="railIndex">02</span><b>LISTENING<br/>PROFILE</b><div className="profileDial"><span>{String(songs.length).padStart(2,"0")}</span><small>TRACKS<br/>READY</small></div><div className="profileStats"><span><b>{String(likes.length).padStart(2,"0")}</b><small>LIKED</small></span><span><b>{String(follows.length).padStart(2,"0")}</b><small>FOLLOWED</small></span></div><button onClick={goStats}>View full profile <ChevronRight size={14}/></button></aside>
    </div><div className="workbenchFooter"><span>YOUR SPACE / CURATED LOCALLY</span><span>NEW ARRIVALS BELOW</span></div>
  </section>
}
function goPageFromHome(fn){fn()}

function PageBack({onClick,label="Back"}){return <button className="backButton pageBackButton" onClick={onClick} aria-label={label}><ArrowLeft size={16}/><span>{label}</span></button>}
function MobileBack({onClick,label="Back"}){return <button className="mobileBack" onClick={onClick} aria-label={label}><ArrowLeft size={17}/><span>{label}</span></button>}
function TrackListHeader(){return <div className="albumTrackHeader"><span>#</span><span>Title</span><span>Plays</span><span><Clock3 size={15} aria-label="Duration"/></span></div>}

function SearchPage({songs,artists,likes,play,like,query,setQuery,back,openArtist,recentSearches,setRecentSearches,addToPlaylist,downloads,downloadSong}){
 const [filter,setFilter]=useState("all");
 function submitSearch(v){setQuery(v); if(v.trim()) setRecentSearches(x=>[v.trim(),...x.filter(q=>q.toLowerCase()!==v.trim().toLowerCase())].slice(0,10));}
 const visibleSongs=filter==="artists"?[]:songs; const visibleArtists=filter==="songs"?[]:artists;
 return <section className="page searchPage"><MobileBack onClick={back} label="Back"/><div className="pageHeading"><span>SEARCH</span><h1>{query?`Results for “${query}”`:"Find something to play."}</h1><p>Search for a song or artist to see results.</p><div className="searchPageInput"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitSearch(query)} placeholder="Search songs or artists..."/></div></div>{!query.trim()&&recentSearches.length>0&&<><Section title="Recent searches"/><div className="recentSearches">{recentSearches.map(q=><button key={q} onClick={()=>submitSearch(q)}><Clock3 size={14}/>{q}<X size={13} onClick={e=>{e.stopPropagation();setRecentSearches(x=>x.filter(v=>v!==q))}}/></button>)}</div></>}{query.trim()&&<div className="searchFilters"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>All</button><button className={filter==="songs"?"active":""} onClick={()=>setFilter("songs")}>Songs</button><button className={filter==="artists"?"active":""} onClick={()=>setFilter("artists")}>Artists</button></div>}{query.trim()&&visibleArtists.length>0&&<><Section title="Artists"/><div className="searchArtistGrid">{visibleArtists.map(a=><button className="searchArtistCard" key={a.artistId||a.name} onClick={()=>openArtist(a.name)}><div className="searchArtistImage">{a.image?<img src={a.image} alt=""/>:<span>{a.name.slice(0,1)}</span>}</div><div><strong>{a.name} <BadgeCheck className="verifiedIcon" size={14} aria-label="Verified by Deluxe Tunes"/></strong><small>Artist</small></div></button>)}</div></>}{query.trim()&&visibleSongs.length>0&&<><Section title="Songs"/><div className="resultList">{visibleSongs.map((s,i)=><Row key={s.id} song={s} n={i+1} liked={likes.includes(s.id)} play={play} like={like} addToPlaylist={addToPlaylist} downloaded={downloads.includes(s.id)} downloadSong={downloadSong}/>)}</div></>}{query.trim()&&!visibleSongs.length&&!visibleArtists.length&&<div className="empty"><Search size={38}/><b>No results</b><span>Try a song title or artist name.</span></div>}</section>}

function LibraryPage({songs,albums,libraryAlbums,toggleAlbumLibrary,likes,play,like,addToPlaylist,downloads,downloadSong,tab,setTab,openArtist,openAlbum,playlists,addPlaylist,openPlaylist,editPlaylist,deletePlaylist,follows=[]}){
 const [sort,setSort]=useState("date"); const liked=songs.filter(s=>likes.includes(s.id)); const sorted=[...liked].sort((a,b)=>sort==="title"?a.title.localeCompare(b.title):sort==="artist"?a.artist.localeCompare(b.artist):sort==="album"?(a.album||"").localeCompare(b.album||""):0);
 const savedAlbums=albums.filter(a=>libraryAlbums.includes(a.id));
 const downloadedSongs=songs.filter(s=>downloads.includes(s.id));
 const tabs=[["playlists","Playlists"],["podcasts","Podcasts"],["albums","Albums"],["artists","Artists"],["downloads","Downloads"]];
 return <section className="page libraryPage"><div className="libraryToolbar"><div className="libraryTitle"><span>YOUR LIBRARY</span><h1>Your Library</h1></div><div className="libraryTabs">{tabs.map(([id,label])=><button key={id} className={tab===id?"libraryTab active":"libraryTab"} onClick={()=>setTab(id)}>{label}</button>)}</div></div>
 {tab==='playlists'&&<div className="libraryContent"><div className="libraryPlaylistCard"><div className="likedArtwork"><Heart size={46} fill="currentColor"/></div><div className="libraryPlaylistCopy"><span>PLAYLIST</span><h2>Liked Songs</h2><p>{liked.length} {liked.length===1?'song':'songs'}</p><button className="primary small" onClick={()=>liked[0]&&play(liked[0])} disabled={!liked.length}><Play size={15} fill="currentColor"/> Play</button></div><button className="ghost" onClick={addPlaylist}><Plus size={15}/> New playlist</button></div><div className="libraryListTools"><b>Liked Songs</b><span>{liked.length} songs</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="date">Date Added</option><option value="title">Title</option><option value="artist">Artist</option><option value="album">Album</option></select></div>{sorted.length?<div className="resultList">{sorted.map((s,i)=><Row key={s.id} song={s} n={i+1} liked={true} play={play} like={like} addToPlaylist={addToPlaylist} downloaded={downloads.includes(s.id)} downloadSong={downloadSong}/>)}</div>:<div className="empty"><Heart size={38}/><b>No liked songs yet</b><span>Tap the heart on any song to add it to Liked Songs.</span></div>}<Section title="Your playlists" action="Create" onAction={addPlaylist}/>{playlists?.length?<div className="playlistShelf">{playlists.map(p=><div className="playlistTile" key={p.id} onClick={()=>openPlaylist(p)} role="button" tabIndex="0" onKeyDown={e=>e.key==="Enter"&&openPlaylist(p)}><ListMusic size={20}/><b>{p.name}</b><small>{p.songs.length} songs</small><span className="playlistTileActions"><button onClick={e=>{e.stopPropagation();editPlaylist(p.id)}} title="Edit playlist"><Pencil size={14}/></button><button onClick={e=>{e.stopPropagation();deletePlaylist(p.id)}} title="Delete playlist"><X size={14}/></button></span></div>)}</div>:<div className="empty compactEmpty"><ListMusic size={28}/><span>Create a playlist to organise your music.</span></div>}</div>}
 {tab==='podcasts'&&<div className="empty libraryEmpty"><Headphones size={38}/><b>No podcasts yet</b><span>Your saved podcasts will appear here.</span></div>}
 {tab==='albums'&&<div className="libraryContent">{savedAlbums.length?<div className="libraryAlbumGrid">{savedAlbums.map(a=><AlbumCard key={a.id} album={a} onOpen={()=>openAlbum(a)}/>)}</div>:<div className="empty libraryEmpty"><Disc3 size={38}/><b>No albums in your library</b><span>Open an album and tap Add to Library to save it here.</span></div>}</div>}
 {tab==='artists'&&<div className="libraryContent libraryArtistsContent">{follows.length?<div className="artistPageGrid">{ARTISTS.filter(a=>follows.includes(a.name)).map(a=>{const song=songs.find(s=>s.id===a.songId)||songs.find(s=>s.artist?.toLowerCase().includes(a.name.toLowerCase()))||songs[0];return <article className="artistPageCard" key={a.name} onClick={()=>openArtist(a.name)}><div className="artistPageImage">{a.image?<img src={a.image} alt=""/>:<Cover song={song}/>}</div><div className="artistPageMeta"><div><h2>{a.name}</h2></div></div></article>})}</div>:<div className="empty libraryEmpty"><Users size={38}/><b>No followed artists yet</b><span>Follow an artist to add them to Your Library.</span></div>}</div>}
 {tab==='downloads'&&<div className="libraryContent"><div className="downloadBanner"><Download size={20}/><div><b>Downloads</b><span>Only songs you explicitly download appear here.</span></div></div>{downloadedSongs.length?<div className="resultList">{downloadedSongs.map((s,i)=><Row key={s.id} song={s} n={i+1} liked={likes.includes(s.id)} play={play} like={like} addToPlaylist={addToPlaylist} downloaded={true} downloadSong={downloadSong}/>)}</div>:<div className="empty libraryEmpty"><Download size={38}/><b>No downloads yet</b><span>Use the download button on a song to keep it available offline.</span></div>}</div>}
 </section>}

function AlbumCard({album,onOpen}){
  const count=album.songs?.length ?? album.trackIds?.length ?? 0;
  const color=album.color||["#ef302f","#16a34a"];
  return <div className="albumCard"><button className="albumCardOpen" onClick={onOpen}>
    <Cover song={{...album,title:album.title,color,artwork:album.artwork}}/>
    <div className="albumCardTitle">{album.title}</div>
    <div className="albumCardMeta">{album.artist} · {count} {count===1?"song":"songs"}</div>
  </button><button className="albumCardMenu" onClick={e=>{e.stopPropagation();onOpen()}} aria-label={`More actions for ${album.title}`} title="More actions"><MoreHorizontal size={16}/></button></div>
}

function AlbumPage({album,songs,stats,sharedPlays,likes,play,like,playAlbum,back,libraryAlbums,toggleAlbumLibrary,addToPlaylist,downloads,downloadSong}){
  if(!album) return <section className="page"><div className="empty"><Disc3 size={38}/><b>Select an album</b></div></section>;
  const isSingle=album.type==="single";
  const color=album.color || (isSingle?["#dfeeff","#9ccaf5"]:["#ef302f","#16a34a"]);
  const tracks = album.songs?.length ? album.songs : (album.trackIds || []).map(id => songs.find(s => s.id === id)).filter(Boolean);
  const discs=album.id==="album-youll-be-alright-kid-alex-warren"?[tracks.slice(0,11),tracks.slice(11)]:[tracks];
  const total=tracks.reduce((sum,s)=>sum+(Number(s.duration||s.length)||0),0);
  const totalLabel=album.id==="album-youll-be-alright-kid-alex-warren"?"1 hr 3 min":fmt(total);
  return <section className={"page albumPage "+(isSingle?"singlePage":"")}>
    <PageBack onClick={back} label={`Back To ${album.artist}`}/>
    <div className="albumHero" style={{"--album-a":color[0],"--album-mid":album.id==="album-youll-be-alright-kid-alex-warren"?"#3f7f2f":album.color?"#7dd3fc":"#5f0d0d","--album-b":color[1]}}>
      <div className="albumHeroArt"><Cover song={{...album,color}} size="heroCover"/></div>
      <div className="albumHeroCopy"><span>{isSingle?"SINGLE":"ALBUM"}</span><h1>{album.title}</h1><p><b>{album.artist}</b> · {album.year||"Local release"} · {tracks.length} {tracks.length===1?"song":"songs"} · {totalLabel}</p><div className="albumHeroActions"><button className="primary" onClick={()=>playAlbum(album,album)} disabled={!tracks.length}><Play size={17} fill="currentColor"/> Play</button><button className="ghost" onClick={()=>tracks[0]&&playOrderedQueue(tracks, album, tracks[0].id)}><Shuffle size={16}/> Shuffle</button><button className={libraryAlbums.includes(album.id)?"ghost librarySave active":"ghost librarySave"} onClick={()=>toggleAlbumLibrary(album)}>{libraryAlbums.includes(album.id)?<><span className="saveIcon">✓</span> Remove from Library</>:<><Plus size={16}/> Add to Library</>}</button></div></div>
    </div>
    <div className="albumDiscs">
      {discs.map((disc,index)=><section className="albumDisc" key={index}>
        {discs.length>1&&<h2 className="albumDiscTitle"><Disc3 size={17}/> Disc {index+1}</h2>}
        <div className="resultList albumResultList">
          {disc.map((s,i)=><Row key={s.id} song={s} n={i+1} stat={s.plays} liked={likes.includes(s.id)} play={song=>play(song,album)} like={like} addToPlaylist={addToPlaylist} downloaded={downloads?.includes(s.id)} downloadSong={downloadSong}/>) }
        </div>
      </section>)}
    </div>
  </section>
}

function AlbumTrack({song,n,plays,liked,play,like,addToPlaylist,downloaded,downloadSong}){
  return <div className="albumTrack">
    <span className="albumTrackNum">{n}</span>
    <div className="albumTrackTitleCell"><button className="albumTrackMain" onClick={()=>play(song)}><span className="albumTrackTitle">{song.title}{song.explicit&&<em>E</em>}</span><span>{song.artist}</span></button></div>
    <div className="albumTrackActions"><button className="trackPlaylistBtn" onClick={()=>addToPlaylist(song)} aria-label="Add to playlist" title="Add to playlist"><ListPlus size={15}/></button>{downloadSong&&<button className={downloaded?"trackDownload active":"trackDownload"} onClick={()=>downloadSong(song)} aria-label={downloaded?"Remove download":"Download"} title={downloaded?"Remove download":"Download"}><Download size={15}/></button>}</div>
    <span className="albumTrackPlays">{formatPlayCount(plays)}</span>
    <span className="albumTrackDuration">{fmt(song.duration||song.length)}</span>
    <button className={liked?"heart liked":"heart"} onClick={()=>like(song.id)} aria-label={liked?"Remove from Liked Songs":"Add to Liked Songs"}><Heart size={16} fill={liked?"currentColor":"none"}/></button>
    <button className="rowPlay" onClick={()=>play(song)} aria-label={`Play ${song.title}`}><Play size={14} fill="currentColor"/></button>
  </div>
}

const ARTISTS=[
  {artistId:"sienna-spiro",name:"Sienna Spiro",meta:"SIENNA SPIRO",image:"/images/artist-sienna-spiro.jpg",songId:"sienna-the-visitor",accent:"lime"},
  {artistId:"aitch",name:"Aitch",meta:"Aitch",image:"/images/artist-aitch.jpg",songId:"rain-aitch-aj-tracey",accent:"cyan"},
  {artistId:"aj-tracey",name:"AJ Tracey",meta:"AJ Tracey",image:"/images/artist-aj-tracey.jpg",songId:"rain-aitch-aj-tracey",accent:"cyan"},
  {artistId:"dave",name:"Dave",meta:"Dave",image:"/images/artist-dave.png",songId:"thiago-silva-dave-aj-tracey",accent:"red"},
  {artistId:"tay-keith",name:"Tay Keith",meta:"Tay Keith",image:"/images/artist-tay-keith.jpg",songId:"rain-aitch-aj-tracey",accent:"cyan"},
  {artistId:"alexandra-burke",name:"Alexandra Burke",meta:"Alexandra Burke",image:"/images/artist-alexandra-burke.jpg",songId:"alexandra-burke-hallelujah",accent:"gold"},
  {artistId:"stormzy",name:"Stormzy",meta:"Stormzy",image:"/images/artist-stormzy.png",songId:"clash-dave-stormzy",accent:"violet"},
  {artistId:"oneda",name:"OneDa",meta:"OneDa",image:"/images/artist-oneda.png",songId:"bad-oneda",accent:"maroon"},
  {artistId:"vibe-chemistry",name:"Vibe Chemistry",meta:"Vibe Chemistry",image:"/images/artist-vibe-chemistry.png",songId:"balling-vibe-chemistry",accent:"cyan"},
  {artistId:"alex-warren",name:"Alex Warren",meta:"Alex Warren",image:"/images/artist-alex-warren.png",songId:null,accent:"rose"},
  {artistId:"christian-gates",name:"Chri$tian Gate$",meta:"Chri$tian Gate$",image:"/images/artist-chritian-gate.png",songId:"numb-christian-gates",accent:"rose"},
  {artistId:"d-block-europe",name:"D-Block Europe",meta:"D-Block Europe",image:"/images/artist-d-block-europe.png",songId:"ufo-d-block-europe-aitch",accent:"peach"},
  {artistId:"arrdee",name:"ArrDee",meta:"ArrDee",image:"/images/artist-arrdee.png",songId:"flowers-say-my-name-arrdee",accent:"lime"},
  {artistId:"bella-kay",name:"Bella Kay",meta:"Bella Kay",image:"/images/artist-bella-kay.png",songId:"bella-kay-iloveitiloveitiloveit",accent:"teal"}
].map(artist=>({...artist,image:assetUrl(artist.image)}));
 function ArtistsPage({songs,openArtist,follows,toggleFollow}){return <section className="page artistsPage"><div className="pageHeading"><span>ARTISTS</span><h1>Artists you might like.</h1><p>Follow artists to shape your home feed.</p></div><div className="artistPageGrid">{ARTISTS.map(a=>{const song=songs.find(s=>s.id===a.songId)||songs.find(s=>s.artist?.toLowerCase().includes(a.name.toLowerCase()))||songs[0];const followed=follows?.includes(a.name);return <article className="artistPageCard" key={a.name}><button className="artistOpen" onClick={()=>openArtist(a.name)}><div className="artistPageImage">{a.image?<img src={a.image} alt=""/>:<Cover song={song}/>}</div><div className="artistPageMeta"><h2>{a.name} <BadgeCheck className="verifiedIcon" size={16} aria-label="Verified by Deluxe Tunes"/></h2></div></button><button className={followed?"followBtn active":"followBtn"} onClick={()=>toggleFollow(a.name)}>{followed?"Following":"Follow"}</button></article>})}</div></section>}

function buildArtistPlayQueue(artist, songs, orderedArtistSongs){
  const artistLower=(artist||"").toLowerCase();
  const artistTrackIds=new Set((orderedArtistSongs||[]).map(song=>song.id));
  const primaryGenre = orderedArtistSongs.find(song=>song.genre)?.genre;
  const similarGenreSongs = primaryGenre ? songs.filter(song => {
    if (!song.genre || song.genre !== primaryGenre) return false;
    if (artistTrackIds.has(song.id)) return false;
    if (!hasSongAudio(song)) return false;
    const songArtist=(song.artist||"").toLowerCase();
    const featured=(song.featuredArtists||[]).map(name=>name.toLowerCase());
    return !songArtist.includes(artistLower) && !featured.includes(artistLower);
  }).slice(0, 5) : [];
  return [...(orderedArtistSongs||[]), ...similarGenreSongs];
}

function ArtistProfile({artist,songs,stats,livePlays,likes,play,like,addToPlaylist,back,openAlbum,follows,toggleFollow,downloads,downloadSong,playOrderedQueue}){
  const data=ARTISTS.find(a=>a.name===artist);
  const artistAlbums=ALBUMS_WITH_ASSETS.filter(a=>a.artist?.toLowerCase()===artist?.toLowerCase() && a.type==="album").map(a=>({...a,songs:(a.trackIds||[]).map(id=>songs.find(s=>s.id===id)).filter(Boolean)}));
  const artistSingles=ALBUMS_WITH_ASSETS.filter(a=>a.artist?.toLowerCase()===artist?.toLowerCase() && a.type==="single").map(a=>({...a,songs:(a.trackIds||[]).map(id=>songs.find(s=>s.id===id)).filter(Boolean)}));
  const artistAlbumTrackIds=new Set(artistAlbums.flatMap(a=>a.trackIds||[]));
  const artistSingleTrackIds=new Set(artistSingles.flatMap(a=>a.trackIds||[]));
  const isSiennaSpiro=artist?.toLowerCase()==="sienna spiro";
  const visitorDeluxeOnlyIds = new Set([
    "this-is-my-house-sienna-spiro",
    "sienna-time-you-and-me",
    "mono-no-aware-sienna-spiro",
    "autumn-leaves-sienna-spiro",
    "sienna-you-stole-the-show-revisited",
    "sienna-die-on-this-hill-unplugged"
  ]);
  const artistSongs=songs.filter(s=>{
    const matchesArtist=s.artist?.toLowerCase().includes(artist?.toLowerCase()||"")||s.featuredArtists?.some(name=>name.toLowerCase()===artist?.toLowerCase());
    if(!matchesArtist) return false;
    if(isSiennaSpiro) return !artistSingleTrackIds.has(s.id)&&(!(artistAlbumTrackIds.has(s.id) && visitorDeluxeOnlyIds.has(s.id)));
    const wasOriginallyPopular=!s.album;
    return (!artistAlbumTrackIds.has(s.id)||wasOriginallyPopular)&&!artistSingleTrackIds.has(s.id);
  });
  const siennaSongOrder=[
    "great-expectation-sienna-spiro",
    "sienna-die-on-this-hill",
    "sienna-pure",
    "sienna-material-lover",
    "sienna-the-visitor",
    "sienna-you-stole-the-show",
    "sienna-maybe",
    "sienna-hes-not-my-baby-im-his",
    "sienna-were-not-in-love",
    "sienna-back-to-blonde"
  ];
  const displayArtistSongs=[...artistSongs].sort((a,b)=>{
    if(artist?.toLowerCase()==="sienna spiro"){
      return siennaSongOrder.indexOf(a.id)-siennaSongOrder.indexOf(b.id);
    }
    return 0;
  });
  const orderedArtistSongs=displayArtistSongs.filter(hasSongAudio);
  const popularSongs=displayArtistSongs;
  const artistPlayQueue = buildArtistPlayQueue(artist, songs, orderedArtistSongs);
  const primaryArtistQueue = artistPlayQueue.length ? artistPlayQueue : popularSongs.length ? popularSongs : orderedArtistSongs;
  const [profileTab,setProfileTab]=useState("songs");
  useEffect(()=>setProfileTab("songs"),[artist]);
  const fallback=artistSongs[0]||songs.find(s=>s.artist?.toLowerCase().includes(artist?.toLowerCase()||""))||songs[0];
  if(!artist) return <section className="page"><div className="empty"><b>Select an artist</b></div></section>;
  return <section className="page artistProfilePage">
    <PageBack onClick={back} label="Back To Artists"/>
    <div className="artistProfileHero">
      <div className="artistProfileAvatar">{data?.image?<img src={data.image} alt=""/>:<Cover song={fallback} size="heroCover"/>}</div>
      <div className="artistProfileCopy"><span>ARTIST</span><h1>{artist} <BadgeCheck className="verifiedIcon profileVerifiedIcon" size={25} aria-label="Verified by Deluxe Tunes"/></h1><div className="verifiedBy"><BadgeCheck size={14}/> Verified by Deluxe Tunes</div><p>{artistSongs.length} {artistSongs.length===1?"song":"songs"} on Deluxe Tunes · {artistAlbums.length} {artistAlbums.length===1?"album":"albums"} · {artistSingles.length} {artistSingles.length===1?"single":"singles"}</p><div className="artistProfileActions"><button className="primary" onClick={()=>artistPlayQueue[0] && playOrderedQueue && playOrderedQueue(artistPlayQueue, null, artistPlayQueue[0].id)} disabled={!artistPlayQueue.length || !playOrderedQueue}><Play size={16} fill="currentColor"/> Play</button><button className={follows?.includes(artist)?"followBtn active":"followBtn"} onClick={()=>toggleFollow(artist)}>{follows?.includes(artist)?"Following":"Follow"}</button></div></div>
    </div>
    <div className="artistProfileTabs" role="tablist" aria-label={`${artist} catalog`}>
      <button className={profileTab==="songs"?"artistProfileTab active":"artistProfileTab"} onClick={()=>setProfileTab("songs")} role="tab" aria-selected={profileTab==="songs"}>Songs</button>
      <button className={profileTab==="albums"?"artistProfileTab active":"artistProfileTab"} onClick={()=>setProfileTab("albums")} role="tab" aria-selected={profileTab==="albums"}>Albums</button>
      <button className={profileTab==="singles"?"artistProfileTab active":"artistProfileTab"} onClick={()=>setProfileTab("singles")} role="tab" aria-selected={profileTab==="singles"}>Singles</button>
    </div>
    {profileTab==="songs" && <>
      <Section title="Popular tracks"/>
      {popularSongs.length ? <div className="resultList">{popularSongs.map((s,i)=><Row key={s.id} song={s} n={i+1} liked={likes.includes(s.id)} play={play} like={like} addToPlaylist={addToPlaylist} downloaded={downloads.includes(s.id)} downloadSong={downloadSong} stats={stats} livePlays={livePlays}/>)}</div> : <div className="empty"><Music2 size={38}/><b>No songs yet</b><span>Add a song credited to {artist} and it will appear here automatically.</span></div>}
    </>}
    {profileTab==="albums" && <>
      <Section title="Latest releases"/>
      {artistAlbums.length ? <div className="artistAlbumGrid">{artistAlbums.map(a=><AlbumCard key={a.id} album={a} onOpen={()=>openAlbum(a)}/>)}</div> : <div className="empty"><Disc3 size={38}/><b>No albums yet</b><span>This artist doesn't have an album on Deluxe Tunes yet.</span></div>}
    </>}
    {profileTab==="singles" && <>
      <Section title={`${artist}'s singles`}/>
      {artistSingles.length ? <div className="artistAlbumGrid">{artistSingles.map(a=><AlbumCard key={a.id} album={a} onOpen={()=>openAlbum(a)}/>)}</div> : <div className="empty"><Disc3 size={38}/><b>No singles yet</b><span>This artist doesn't have a single on Deluxe Tunes yet.</span></div>}
    </>}
  </section>
}
function PlaylistPage({playlist,songs,likes,play,like,addToPlaylist,removeFromPlaylist,editPlaylist,deletePlaylist,downloads,downloadSong,back}){
 const tracks=(playlist?.songs||[]).map(id=>songs.find(s=>s.id===id)).filter(Boolean);
 if(!playlist)return <section className="page"><MobileBack onClick={back} label="Back"/><div className="empty"><ListMusic size={38}/><b>Select a playlist</b></div></section>;
 return <section className="page playlistPage"><MobileBack onClick={back} label="Back"/><div className="playlistHero"><div className="playlistHeroArt"><ListMusic size={58}/></div><div><span>PLAYLIST</span><h1>{playlist.name}</h1><p>{tracks.length} {tracks.length===1?"song":"songs"}</p><div className="playlistHeroActions"><button className="primary" onClick={()=>tracks[0]&&play(tracks[0])} disabled={!tracks.length}><Play size={16} fill="currentColor"/> Play</button><button className="ghost" onClick={()=>editPlaylist(playlist.id)}><MoreHorizontal size={16}/> Edit</button><button className="ghost danger" onClick={()=>deletePlaylist(playlist.id)}><X size={16}/> Delete</button></div></div></div><Section title="Songs"/><div className="resultList">{tracks.length?tracks.map((s,i)=><div className="playlistTrackWrap" key={s.id}><Row song={s} n={i+1} liked={likes.includes(s.id)} play={play} like={like} addToPlaylist={addToPlaylist} downloaded={downloads.includes(s.id)} downloadSong={downloadSong} removeFromPlaylist={removeFromPlaylist} playlistId={playlist.id}/></div>):<div className="empty compactEmpty"><ListMusic size={28}/><b>This playlist is empty</b><span>Add songs with the Add to Playlist button.</span></div>}</div></section>}

function lyricsPalette(songId){
 const index=Math.max(0,INITIAL.findIndex(s=>s.id===songId));
 const hue=(index*137.508)%360;
 return {bg:`hsl(${hue.toFixed(3)} 46% 10%)`,accent:`hsl(${hue.toFixed(3)} 72% 27%)`,glow:`hsl(${((hue+42)%360).toFixed(3)} 78% 46%)`};
}

const SIENNA_SPIRO_SONG_IDS = new Set([
  "sienna-the-visitor",
  "sienna-you-stole-the-show",
  "great-expectation-sienna-spiro",
]);
const RAIN_SONG_IDS = new Set([
  "rain-aitch-aj-tracey",
]);
const BALLING_SONG_IDS = new Set([
  "balling-vibe-chemistry",
]);

function LyricsPage({songs,current,position,play,showLyrics,setShowLyrics,back,backLabel,queueSongs,queueOpen,setQueueOpen,addToQueue,removeFromQueue,moveQueue,focusMode,setFocusMode,next,prev}){
 const song=current||songs[0];
 const lines=LYRICS[song?.id]||[];
 const activeIndex=lines.length?lines.reduce((idx,line,i)=>position>=line[0]?i:idx,-1):-1;
 const activeRef=useRef(null); const touchStart=useRef(null); const longPress=useRef(null);
 const palette=lyricsPalette(song?.id);
 const shouldUseSiennaBack = !!song && SIENNA_SPIRO_SONG_IDS.has(song.id);
 const shouldUseRainBack = !!song && RAIN_SONG_IDS.has(song.id);
 const shouldUseBallingBack = !!song && BALLING_SONG_IDS.has(song.id);
 const shouldUseMountBack = !!song && SINGLE_SONG_IDS.has(song.id);
 const stageArtworkStyle = song?.artwork ? {
   backgroundImage: `linear-gradient(180deg, rgba(8,10,14,0.16), rgba(8,10,14,0.62)), url(${song.artwork})`,
   backgroundSize: "cover",
   backgroundPosition: "center center",
   backgroundRepeat: "no-repeat",
 } : {background:`radial-gradient(circle at 50% 38%, ${palette.glow}44, transparent 34%), radial-gradient(circle at 50% 68%, ${palette.accent}66, transparent 52%), linear-gradient(145deg, ${palette.bg}, #050609)`};
  const lyricsBackgroundStyle = {
   backgroundImage: `linear-gradient(180deg, rgba(8,10,14,0.14), rgba(8,10,14,0.8)), url(${assetUrl("/images/mount-back.png")})`,
   backgroundSize: "cover",
   backgroundPosition: "center center",
   backgroundRepeat: "no-repeat",
 };
 useEffect(()=>{if(showLyrics&&activeRef.current)activeRef.current.scrollIntoView({behavior:"smooth",block:"center"})},[activeIndex,showLyrics]);
 const gestureStart=e=>{touchStart.current=e.touches?.[0]?.clientX??e.clientX; longPress.current=setTimeout(()=>{setQueueOpen(true);longPress.current=null},650)};
 const gestureEnd=e=>{if(longPress.current){clearTimeout(longPress.current);longPress.current=null} const end=e.changedTouches?.[0]?.clientX??e.clientX; if(touchStart.current==null)return; const dx=end-touchStart.current; touchStart.current=null; if(Math.abs(dx)>70){dx<0?next():prev()}};
 return <section className={(focusMode?"page lyricsPage focusMode":"page lyricsPage")+(showLyrics?" showingLyrics":"")} style={{"--lyrics-bg":palette.bg,"--lyrics-accent":palette.accent,"--lyrics-glow":palette.glow}}>
  <PageBack onClick={back} label={backLabel}/>
  <div className="nowPlayingTop"><div><span>NOW PLAYING</span><h1>{song?.title}</h1><p>{song?.artist}</p></div></div>
  {!showLyrics?<><div className="nowPlayingStage fullPlayerStage" style={stageArtworkStyle}><div className="nowPlayingGlow"/><div className="nowPlayingCoverWrap" onTouchStart={gestureStart} onTouchEnd={gestureEnd} onMouseDown={gestureStart} onMouseUp={gestureEnd}><Cover song={song} size="heroCover"/></div><div className="nowPlayingInfo"><span>NOW PLAYING</span><h2>{song?.title}</h2><p>{song?.artist}</p></div></div></>:
  <div className="lyricsOnlyView" style={lyricsBackgroundStyle}><div className="lyricsOnlyHeader"><span>SYNCED LYRICS</span><b>{song?.title}</b><small>{song?.artist}</small></div>{lines.length?<div className="lyricsScroll">{lines.map(([time,text],i)=><button ref={i===activeIndex?activeRef:null} key={`${time}-${i}`} className={i===activeIndex?"lyricLine active":i<activeIndex?"lyricLine past":"lyricLine future"} onClick={()=>{if(document.querySelector("audio"))document.querySelector("audio").currentTime=time}}>{text||" "}</button>)}</div>:<div className="empty lyricsEmpty"><Mic2 size={38}/><b>No synced lyrics for this song</b><span>Synced lyrics are available for selected tracks.</span></div>}</div>}
 </section>}
function QueuePanel({songs,queueSongs,current,likes,like,addToPlaylist,downloads,downloadSong,onClose,removeFromQueue,moveQueue,addToQueue,play,clearQueue}){
  const queuedIds=new Set(queueSongs.map(item=>item.id));
  const availableSongs=songs
    .filter(song=>song.id!==current?.id&&!queuedIds.has(song.id)&&hasSongAudio(song)&&isRelatedGenre(current?.genre,song.genre))
    .sort((a,b)=>Number(b.genre===current?.genre)-Number(a.genre===current?.genre))
    .slice(0,5);
  return <div className="overlayPanel"><div className="queuePanel queuePanelModern">
    <div className="panelHead"><div><span>PLAYBACK</span><h2>Queue</h2><p className="queueSubtitle">Build what plays next.</p></div><div><button className="ghost" onClick={clearQueue} disabled={!queueSongs.length}>Clear</button><button className="iconBtn" onClick={onClose} aria-label="Close queue"><X size={18}/></button></div></div>
    <div className="queueAddBox"><div className="queueSuggestionLabel"><Sparkles size={14}/> Suggested next</div><div className="queueSuggestions">{availableSongs.map(song=><button key={song.id} onClick={()=>addToQueue(song)}><Cover song={song}/><span><b>{song.title}</b><small>{song.artist}</small></span><Plus size={16}/></button>)}{!availableSongs.length&&<small>All available songs are already queued</small>}</div></div>
    <div className="queueList queueListModern">{queueSongs.length?<>{queueSongs.map((s,i)=><div className={current?.id===s.id?"queueRow current":"queueRow"} key={s.id}><span className="queuePosition">{i+1}</span><button className="queueTrack" onClick={()=>play(s)}><Cover song={s}/><span><b>{s.title}</b><small>{s.artist}</small></span></button><button className={likes?.includes(s.id)?"heart liked":"heart"} onClick={()=>like?.(s.id)} aria-label="Liked Songs"><Heart size={15} fill={likes?.includes(s.id)?"currentColor":"none"}/></button><button onClick={()=>addToPlaylist?.(s)} title="Add to playlist" aria-label="Add to playlist"><ListPlus size={15}/></button><button className={downloads?.includes(s.id)?"queueDownload active":"queueDownload"} onClick={()=>downloadSong?.(s)} title="Download" aria-label="Download"><Download size={15}/></button><button className="queueMoveUp" onClick={()=>i>0&&moveQueue(i,i-1)} disabled={i===0} title={i===0?"Already first":"Move up"} aria-label={i===0?"Already first":"Move up in queue"}><ArrowLeft size={15}/></button><button onClick={()=>removeFromQueue(s.id)} title="Remove" aria-label="Remove from queue"><X size={15}/></button></div>)}</>:<div className="queueEmpty"><ListOrdered size={30}/><b>Your queue is empty.</b><span>Search above to choose what plays next.</span></div>}</div>
  </div></div>
}
function SettingsPanel({account,setAccount,theme,setTheme,discordConnected,setDiscordConnected,discordAuth,setDiscordAuth,spotifyConnected,setSpotifyConnected,spotifyProfile,setSpotifyProfile,spotifyAuthState,setSpotifyAuthState,matchSongFromSpotify,extractSpotifyTrackFromEntry,onImportSpotifyPlaylists,onImportSpotifyLikedSongs,onImportSpotifyHistory,onImportSpotifyPlaylist,onSignOut,onClose,sleepTimer,setSleepTimer,streak,streakMilestoneInfo,streakHistory,streakCalendar}){
  async function connectDiscord() {
    const w = openAuthWindow(`${API_BASE}/api/discord/auth/start`, "deluxeTunesDiscord");
    if (!w) {
      return;
    }
    const isExternalBrowser = Boolean(w?.external);
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/discord/status`, { cache: "no-store" });
        if (!r.ok) return;
        const payload = await r.json();
        const user = payload?.user ?? payload?.discord ?? null;
        if (user) {
          setDiscordAuth(user);
          setDiscordConnected(true);
          clearInterval(timer);
          if (!isExternalBrowser && !w.closed) w.close();
        }
      } catch (err) {}
      if (!isExternalBrowser && w.closed) clearInterval(timer);
    }, 1500);
  }

  async function disconnectDiscord() {
    try { await fetch(`${API_BASE}/api/discord/logout`, { method: "POST" }); } catch {}
    setDiscordAuth(null);
    setDiscordConnected(false);
    localStorage.removeItem("dt8_discord_auth");
  }

  async function connectSpotify() {
    setSpotifyAuthState("connecting");
    const w = openAuthWindow(`${API_BASE}/api/spotify/auth/start`, "deluxeTunesSpotify");
    if (!w) {
      setSpotifyAuthState("connected");
      return;
    }
    const isExternalBrowser = Boolean(w?.external);
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/spotify/status`, { cache: "no-store" });
        if (!r.ok) return;
        const payload = await r.json();
        if (payload?.authenticated && payload?.user) {
          setSpotifyProfile(payload.user);
          setSpotifyConnected(true);
          setSpotifyAuthState("connected");
          clearInterval(timer);
          if (!isExternalBrowser && !w.closed) w.close();
          return;
        }
      } catch (err) {}
      if (!isExternalBrowser && w.closed) {
        clearInterval(timer);
        if (!spotifyConnected) setSpotifyAuthState("failed");
      }
    }, 1500);
  }

  async function disconnectSpotify() {
    try { await fetch(`${API_BASE}/api/spotify/logout`, { method: "POST" }); } catch {}
    setSpotifyConnected(false);
    setSpotifyProfile(null);
    setSpotifyAuthState("idle");
    setSpotifyPlaylists([]);
    setSpotifyPlaylistMenuOpen(false);
    localStorage.removeItem(STORAGE_KEYS.spotifyProfile);
  }

  const [tab, setTab] = useState("account");
  const [nickname, setNickname] = useState(account?.nickname || "");
  const [avatar, setAvatar] = useState(account?.avatar || "");
  const [spotifyPlaylistMenuOpen, setSpotifyPlaylistMenuOpen] = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [spotifyPlaylistBusy, setSpotifyPlaylistBusy] = useState(false);
  const [spotifyPlaylistSearch, setSpotifyPlaylistSearch] = useState("");
  const [spotifyImportSummary, setSpotifyImportSummary] = useState(null);
  const [spotifyImportError, setSpotifyImportError] = useState("");
  const [spotifyImportPreview, setSpotifyImportPreview] = useState(null);
  const [spotifyImportName, setSpotifyImportName] = useState("");

  const filteredSpotifyPlaylists = useMemo(() => {
    const query = spotifyPlaylistSearch.trim().toLowerCase();
    if (!query) return spotifyPlaylists;
    return spotifyPlaylists.filter((playlist) => (playlist.name || "").toLowerCase().includes(query));
  }, [spotifyPlaylists, spotifyPlaylistSearch]);

  function chooseAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) return alert("Choose an image under 2 MB.");
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function save() {
    const next = { ...account, nickname: nickname.trim() || account.nickname, avatar };
    setAccount(next);
    localStorage.setItem(STORAGE_KEYS.account, JSON.stringify(next));
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(next));
  }

  async function loadSpotifyPlaylists() {
    if (!spotifyConnected) return;
    setSpotifyImportError("");
    setSpotifyPlaylistBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/spotify/playlists`, { cache: "no-store" });
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(payload?.error || "Could not load Spotify playlists.");
      const items = Array.isArray(payload.items) ? payload.items : [];
      setSpotifyPlaylists(items);
      setSpotifyPlaylistMenuOpen(true);
    } catch (err) {
      setSpotifyImportError(err?.message || "Could not load Spotify playlists.");
    } finally {
      setSpotifyPlaylistBusy(false);
    }
  }

  useEffect(() => {
    if (!spotifyConnected) {
      setSpotifyPlaylists([]);
      setSpotifyPlaylistMenuOpen(false);
      setSpotifyImportPreview(null);
      return;
    }
    setSpotifyPlaylistMenuOpen(true);
    loadSpotifyPlaylists();
  }, [spotifyConnected]);

  async function openSpotifyPlaylistMenu() {
    if (!spotifyConnected) return;
    setSpotifyImportError("");
    const next = !spotifyPlaylistMenuOpen;
    setSpotifyPlaylistMenuOpen(next);
    if (next && !spotifyPlaylists.length) {
      await loadSpotifyPlaylists();
    }
  }

  async function previewSpotifyPlaylist(playlist) {
    if (!playlist?.id) return;
    setSpotifyPlaylistBusy(true);
    setSpotifyImportError("");
    try {
      const r = await fetch(`${API_BASE}/api/spotify/playlists/${encodeURIComponent(playlist.id)}/items`, { cache: "no-store" });
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(payload?.error || "Could not load Spotify playlist tracks.");
      const items = Array.isArray(payload.items) ? payload.items : [];
      const matchedIds = [];
      const seenIds = new Set();
      const unmatched = [];
      const seenKeys = new Set();

      items.forEach((entry) => {
        const track = extractSpotifyTrackFromEntry(entry);
        if (!track || (track.type && track.type !== "track")) return;
        const title = track.name || "Unknown track";
        const artist = (track.artists || []).map((a) => a.name).filter(Boolean).join(", ") || "Unknown artist";
        const album = track.album?.name || "";
        const match = typeof matchSongFromSpotify === "function" ? matchSongFromSpotify({ title, artist, album }) : null;
        const dedupeKey = match ? match.id : `${normalizeKey(title)}|${normalizeKey(artist)}`;
        if (match && !seenIds.has(match.id)) {
          seenIds.add(match.id);
          matchedIds.push(match.id);
        } else if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          unmatched.push({ title, artist, album });
        }
      });

      setSpotifyImportPreview({
        id: playlist.id,
        name: playlist.name || "Spotify Playlist",
        image: playlist.image || null,
        trackCount: items.length,
        availableCount: matchedIds.length,
        unavailableCount: unmatched.length,
        unavailable: unmatched.slice(0, 10),
        playlist,
      });
      setSpotifyImportName(playlist.name || "Spotify Playlist");
    } catch (err) {
      setSpotifyImportError(err?.message || "Could not preview this Spotify playlist.");
      setSpotifyImportPreview(null);
    } finally {
      setSpotifyPlaylistBusy(false);
    }
  }

  async function confirmSpotifyImport() {
    if (!spotifyImportPreview?.playlist) return;
    const nextName = (spotifyImportName || spotifyImportPreview.name || "Spotify Playlist").trim();
    if (!nextName) {
      setSpotifyImportError("Choose a Deluxe Tunes playlist name before importing.");
      return;
    }
    setSpotifyPlaylistBusy(true);
    try {
      const summary = await onImportSpotifyPlaylist(spotifyImportPreview.playlist, nextName);
      if (summary?.error) {
        setSpotifyImportError(summary.error);
        setSpotifyImportSummary(null);
      } else {
        setSpotifyImportSummary(summary);
        setSpotifyImportError("");
        setSpotifyImportPreview(null);
      }
    } catch (err) {
      setSpotifyImportError(err?.message || "Spotify playlist import failed.");
      setSpotifyImportSummary(null);
    } finally {
      setSpotifyPlaylistBusy(false);
      setSpotifyPlaylistMenuOpen(false);
    }
  }

  const spotifyStatusText = spotifyConnected
    ? `Connected as ${spotifyProfile?.display_name || "Spotify user"}.`
    : spotifyAuthState === "connecting"
      ? "Connecting to Spotify…"
      : spotifyAuthState === "failed"
        ? "Authentication failed. Please try again."
        : "Not connected.";

  return (
    <div className="overlayPanel accountSettingsOverlay">
      <div className="settingsPanel accountSettings">
        <div className="panelHead">
          <div><span>DELUXE TUNES</span><h2>Settings</h2></div>
          <button className="iconBtn" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="settingsTabs">
          <button className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}><UserRound size={15}/>Account</button>
          <button className={tab === "appearance" ? "active" : ""} onClick={() => setTab("appearance")}><Sun size={15}/>Appearance</button>
          <button className={tab === "connections" ? "active" : ""} onClick={() => setTab("connections")}><Link2 size={15}/>Connections</button>
        </div>

        {tab === "account" && (
          <div className="settingsBody">
            <div className="profileEditor">
              <div className="profileBigAvatar">{avatar ? <img src={avatar} alt="Profile"/> : <UserRound size={30}/>}</div>
              <div><b>{account?.nickname || "Deluxe Listener"}</b><span>{account?.email || ""}</span></div>
            </div>

            <div className="deluxeStreakCard">
              <div className="deluxeStreakHeader">
                <div className="deluxeStreakIcon"><Sparkles size={16}/></div>
                <div>
                  <span>DELUXE STREAK</span>
                  <b>🔥 {streak.current || 0} Day Streak</b>
                </div>
              </div>
              <div className="deluxeStreakMetrics">
                <div><small>Current</small><b>{streak.current || 0}</b></div>
                <div><small>Longest</small><b>{streak.longest || 0}</b></div>
              </div>
              <div className="deluxeStreakMilestone">
                <span>NEXT MILESTONE</span>
                <b>🔥 {streakMilestoneInfo.milestone || 3} DAYS</b>
                <small>{streakMilestoneInfo.remaining > 0 ? `${streakMilestoneInfo.remaining} days remaining` : "Milestone reached"}</small>
              </div>
              {streakHistory.length > 0 && (
                <div className="deluxeStreakHistory">
                  {streakHistory.map((value, index) => (
                    <span key={`${value}-${index}`}>Previous: {value} days</span>
                  ))}
                </div>
              )}
              <div className="deluxeStreakCalendar" aria-label="Streak calendar">
                {streakCalendar.map((cell) => (
                  <div key={cell.key} className={cell.active ? "deluxeCalendarDay active" : "deluxeCalendarDay"} title={cell.active ? cell.key : "No listening day"} />
                ))}
              </div>
            </div>

            <label className="settingLabel">Nickname<div className="authInput"><UserRound size={15}/><input value={nickname} onChange={(e) => setNickname(e.target.value)}/></div></label>
            <div className="avatarUpload settingUpload">
              <label className="uploadBtn"><Upload size={15}/> Change profile picture<input type="file" accept="image/*" onChange={chooseAvatar}/></label>
              <small>Stored locally for this device account.</small>
            </div>
            <button className="primary saveSettings" onClick={save}>Save profile</button>
            <button className="dangerBtn" onClick={onSignOut}><LogOut size={15}/> Sign out</button>
          </div>
        )}

        {tab === "appearance" && (
          <div className="settingsBody">
            <div className="settingsSection">
              <b>Theme</b>
              <p>Automatically adapts to local time. No permissions required.</p>
              <div className="themeChoices">
                {[['auto', 'Auto', RotateCcw], ['day', 'Always Day', Sun], ['night', 'Always Night', Moon]].map(([id, label, I]) => (
                  <button className={theme === id ? "active" : ""} key={id} onClick={() => setTheme(id)}><I size={16}/>{label}</button>
                ))}
              </div>
            </div>
            <div className="settingsSection">
              <b>Sleep timer</b>
              <p>Fade playback out and stop after the selected time.</p>
              <div className="themeChoices">
                <button onClick={() => setSleepTimer(15 * 60)}>15 min</button>
                <button onClick={() => setSleepTimer(30 * 60)}>30 min</button>
                <button onClick={() => setSleepTimer(60 * 60)}>60 min</button>
                <button onClick={() => setSleepTimer(null)}>Off</button>
              </div>
              {sleepTimer && <div className="sleepCountdown"><Timer size={15}/> {Math.floor(sleepTimer / 60)}:{String(sleepTimer % 60).padStart(2, "0")} remaining</div>}
            </div>
          </div>
        )}

        {tab === "connections" && (
          <div className="settingsBody">
            <div className="connectionCard">
              <div className="connectionIcon discordIcon">D</div>
              <div className="connectionCopy">
                <b>Discord</b>
                <span>Authenticate with your Discord account before Rich Presence can be enabled.</span>
                <small>{discordAuth ? `Connected as ${discordAuth.username || discordAuth.global_name || "Discord user"}.` : "Not connected."}</small>
              </div>
              <button className={discordAuth ? "ghost connectionToggle active" : "primary connectionToggle"} onClick={discordAuth ? disconnectDiscord : connectDiscord}>{discordAuth ? "Disconnect" : "Connect Discord"}</button>
            </div>

            <div className="connectionCard spotifyCard">
              <div className="connectionIcon spotifyIcon">S</div>
              <div className="connectionCopy">
                <b>Spotify</b>
                <span>Connect your Spotify account to Deluxe Tunes.</span>
                <small>{spotifyStatusText}</small>
                {spotifyProfile?.images?.[0]?.url && <img src={spotifyProfile.images[0].url} alt="Spotify profile" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", marginTop: 6 }} />}
              </div>
              <button className={spotifyConnected ? "ghost connectionToggle active" : "primary connectionToggle"} onClick={spotifyConnected ? disconnectSpotify : connectSpotify} disabled={spotifyAuthState === "connecting"}>{spotifyConnected ? "Disconnect" : spotifyAuthState === "connecting" ? "Connecting..." : "Connect Spotify"}</button>
            </div>

            {spotifyConnected && (
              <div className="spotifyImportPanel">
                <button className="spotifyImportToggle open" onClick={openSpotifyPlaylistMenu}>
                  IMPORT FROM SPOTIFY <ChevronRight size={14}/>
                </button>

                {spotifyPlaylistMenuOpen && (
                  <div className="spotifyImportFlow">
                    {spotifyPlaylistBusy ? (
                      <div className="spotifyStep"><small>Loading your Spotify playlists…</small></div>
                    ) : spotifyPlaylists.length ? (
                      <>
                        <div className="spotifyPlaylistSearch">
                          <input value={spotifyPlaylistSearch} onChange={(e) => setSpotifyPlaylistSearch(e.target.value)} placeholder="Filter playlists (optional)" />
                        </div>
                        {filteredSpotifyPlaylists.length ? (
                          <div className="spotifyPlaylistList">
                            {filteredSpotifyPlaylists.map((playlist) => (
                              <button key={playlist.id} className="spotifyPlaylistRow" onClick={() => previewSpotifyPlaylist(playlist)}>
                                <div className="spotifyPlaylistArt">{playlist.image ? <img src={playlist.image} alt={playlist.name} /> : <Music2 size={18} />}</div>
                                <div className="spotifyPlaylistMeta">
                                  <b>{playlist.name}</b>
                                  <small>{playlist.trackCount ?? playlist.tracks?.total ?? 0} tracks</small>
                                </div>
                                <ChevronRight size={14}/>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="spotifyStep"><small>No playlists matched your search.</small></div>
                        )}
                      </>
                    ) : (
                      <div className="spotifyStep"><small>No Spotify playlists were returned for this account.</small></div>
                    )}
                  </div>
                )}
              </div>
            )}

            {spotifyImportError && (
              <div className="connectionNote dangerNote">
                <ShieldAlert size={16}/>
                <div><b>Spotify import issue</b><p>{spotifyImportError}</p></div>
              </div>
            )}

            {spotifyImportSummary && (
              <div className="connectionNote successNote">
                <CheckCircle2 size={16}/>
                <div><b>Spotify playlist imported</b><p>{spotifyImportSummary.name} · {spotifyImportSummary.imported} tracks</p></div>
              </div>
            )}

            {spotifyImportPreview && (
              <div className="spotifyPreviewCard">
                <div className="spotifyPreviewHeader">
                  <div className="spotifyPlaylistArt">{spotifyImportPreview.image ? <img src={spotifyImportPreview.image} alt={spotifyImportPreview.name} /> : <Music2 size={18} />}</div>
                  <div>
                    <span>IMPORT PREVIEW</span>
                    <b>{spotifyImportPreview.name}</b>
                    <small>{spotifyImportPreview.trackCount} tracks</small>
                  </div>
                </div>
                <div className="spotifyPreviewStats">
                  <div><b>{spotifyImportPreview.availableCount}</b><span>matched</span></div>
                  <div><b>{spotifyImportPreview.unavailableCount}</b><span>not in library</span></div>
                </div>
                {spotifyImportPreview.unavailable.length ? (
                  <div className="spotifyPreviewList">
                    <small>Not matched in Deluxe Tunes:</small>
                    {spotifyImportPreview.unavailable.slice(0, 5).map((song, index) => (
                      <div key={`${song.title}-${song.artist}-${index}`} className="spotifyPreviewTrack">
                        <span>{song.title}</span>
                        <small>{song.artist}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="spotifyPreviewList"><small>All tracks in this playlist were matched to Deluxe Tunes.</small></div>
                )}
                <label className="settingLabel">Deluxe Tunes playlist name<div className="authInput"><ListMusic size={15}/><input value={spotifyImportName} onChange={(e) => setSpotifyImportName(e.target.value)} /></div></label>
                <div className="spotifyPreviewActions">
                  <button className="ghost" onClick={() => setSpotifyImportPreview(null)}>Back</button>
                  <button className="primary" onClick={confirmSpotifyImport} disabled={spotifyPlaylistBusy}>Import playlist</button>
                </div>
              </div>
            )}

            {spotifyConnected && (
              <div className="connectionNote">
                <Link2 size={16}/>
                <div><b>Spotify account connection</b><p>Connecting Spotify authenticates your Deluxe Tunes account without enabling Spotify playback in the player.</p></div>
              </div>
            )}

            {spotifyConnected && (
              <div className="connectionNote">
                <ShieldCheck size={16}/>
                <div><b>Privacy-first</b><p>Only your Spotify profile information is stored locally on this device. No Spotify playback tokens are kept in the browser.</p></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function fmtDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h) return `${h}h${m ? ` ${m}m` : ""}`;
  return `${m}m`;
}

function PlaylistPicker({song,playlists,addPlaylist,addToPlaylist,onClose}){return <div className="overlayPanel playlistPickerOverlay"><div className="playlistPicker"><div className="panelHead"><div><span>ORGANISE</span><h2>Add to Playlist</h2><p>{song?.title}</p></div><button className="iconBtn" onClick={onClose}><X size={18}/></button></div><button className="ghost pickerCreate" onClick={()=>{addPlaylist();}}><Plus size={15}/> Create new playlist</button><div className="pickerList">{playlists.length?playlists.map(p=><button key={p.id} onClick={()=>addToPlaylist(song,p.id)}><ListMusic size={16}/><span><b>{p.name}</b><small>{p.songs.length} songs</small></span><ChevronRight size={15}/></button>):<div className="empty compactEmpty"><ListMusic size={25}/><span>No playlists yet.</span></div>}</div></div></div>}

function StatsPage({songs,stats,livePlays,seconds,plays,back,play,like,likes,addToPlaylist,downloads,downloadSong}){
 const top=[...songs].sort((a,b)=>(getEffectivePlayCount(b,stats,livePlays))-(getEffectivePlayCount(a,stats,livePlays))).slice(0,5);
 const profile = calculateTasteProfile(songs, stats, livePlays);
 const totalProfileShare = profile.reduce((sum, item) => sum + item.share, 0) || 1;
 return <section className="page statsPage"><MobileBack onClick={back} label="Back"/><div className="pageHeading"><span>YOUR STATS</span><h1>Your listening story.</h1><p>Your stats, taste profile and collection stay on this device.</p></div>
 <div className="stats"><Stat icon={Clock3} value={fmtDuration(seconds)} label="Listening time"/><Stat icon={Play} value={plays} label="Total plays"/><Stat icon={Disc3} value={songs.length} label="Songs"/><Stat icon={Users} value={[...new Set(songs.map(s=>s.artist))].length} label="Artists"/></div>
 <div className="dnaGrid"><div className="panel dnaPanel"><div className="sectionTitle"><h2>Taste DNA</h2><span>BASED ON YOUR LISTENING</span></div><div className="dnaBars">{profile.map(({genre, share})=><div key={genre}><div><b>{genre}</b><small>{Math.round(share)}%</small></div><i style={{width:`${(share / totalProfileShare) * 100}%`}}/></div>)}</div><div className="dnaFacts"><span><b>Energy</b> {profile[0]?.genre || "Balanced"}</span><span><b>Era</b> Current rotation</span><span><b>Mix</b> {profile.slice(0,2).map(item => item.genre).join(" + ") || "Your mix"}</span></div></div><div className="panel storyCard"><span>WEEKLY LISTENING STORY</span><b>{fmtDuration(seconds)} of listening</b><p>{plays} plays across your Deluxe Tunes collection.</p><button className="primary small" onClick={()=>navigator.share?.({title:"My Deluxe Tunes week",text:`${fmtDuration(seconds)} listening time · ${plays} plays`})}><Share2 size={14}/> Share recap</button></div></div>
 <div className="panel statsTrackList"><Section title="Top tracks" action="All time"/>{top.map((s,i)=><Row key={s.id} song={s} n={i+1} stat={`${getEffectivePlayCount(s,stats,livePlays)} plays`} liked={likes?.includes(s.id)} play={play} like={like} addToPlaylist={addToPlaylist} downloaded={downloads?.includes(s.id)} downloadSong={downloadSong} stats={stats} livePlays={livePlays}/>)}</div>
 <div className="sectionTitle"><h2>Digital Collection</h2><span>ALBUMS & PLAYLISTS</span></div><div className="collectionShelf">{songs.slice(0,8).map(s=><div key={s.id} className="collectionItem"><Cover song={s}/><b>{s.album||s.title}</b><small>{s.artist}</small></div>)}</div>
 <div className="socialGrid"><div className="socialCard"><UsersRound size={20}/><b>Listen Together</b><span>Create a shared queue when social playback is connected.</span><button className="ghost" onClick={()=>navigator.share?.({title:"Deluxe Tunes",text:"Listen Together"})}>Invite people</button></div><div className="socialCard"><ListMusic size={20}/><b>Collaborative Playlists</b><span>Build playlists with friends and keep the queue in sync.</span><button className="ghost">Create collaborative</button></div><div className="socialCard"><Layers3 size={20}/><b>Taste Overlap</b><span>Compare favourite artists when viewing another profile.</span><button className="ghost">View overlap</button></div></div>
 </section>}

function Section({title,action,onAction}){return <div className="sectionTitle"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}<ChevronRight size={14}/></button>}</div>}
function QueueMenu({song,addToPlaylist,downloadSong,downloaded,removeFromPlaylist,playlistId}){const [open,setOpen]=useState(false);const close=()=>setOpen(false);return <div className="songMenu"><button className="songMenuTrigger" onClick={e=>{e.stopPropagation();setOpen(v=>!v)}} aria-label={`More actions for ${song.title}`} title="More actions"><MoreHorizontal size={16}/></button>{open&&<div className="songMenuPopover"><button onClick={()=>{queueSongAction(song);close()}}><ListOrdered size={14}/> Add to queue</button>{addToPlaylist&&<button onClick={()=>{addToPlaylist(song);close()}}><ListPlus size={14}/> Add to playlist</button>}{downloadSong&&<button onClick={()=>{downloadSong(song);close()}}><Download size={14}/> {downloaded?"Remove download":"Download"}</button>}{removeFromPlaylist&&playlistId&&<button onClick={()=>{removeFromPlaylist(song.id,playlistId);close()}}><Trash2 size={14}/> Remove from playlist</button>}</div>}</div>}
function PlayerMoreMenu({song,addToPlaylist,addToQueue,liked,onLike,onQueue,volume,setVolume,mobile=false}){
  const [open,setOpen]=useState(false);
  const menuRef=useRef(null);
  const close=()=>setOpen(false);

  useEffect(()=>{
    if(!song) return undefined;
    const handlePointerDown=(event)=>{
      if(menuRef.current && !menuRef.current.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return ()=>document.removeEventListener("pointerdown", handlePointerDown);
  }, [song]);

  if(!song)return null;

  return <div ref={menuRef} className={mobile ? "playerMoreMenu mobilePlayerMoreMenu" : "playerMoreMenu"}>
    <button className="playerMoreButton" onClick={e=>{e.stopPropagation(); setOpen(v=>!v)}} aria-label="More song options" title="More song options"><MoreHorizontal size={18}/></button>
    {open&&<div className={mobile ? "playerMorePopover mobilePlayerMorePopover" : "playerMorePopover"}>
      {addToQueue&&<button onClick={()=>{addToQueue(song);close()}}><ListOrdered size={14}/> Add to queue</button>}
      {addToPlaylist&&<button onClick={()=>{addToPlaylist(song);close()}}><ListPlus size={14}/> Add to playlist</button>}
      {mobile && typeof setVolume === "function" && <label className="mobileVolumeRow"><Volume2 size={14}/><input type="range" min="0" max="1" step="0.01" value={volume ?? 0} onChange={e=>setVolume(Number(e.target.value))} aria-label="Volume" /></label>}
      {!mobile && onLike&&<button onClick={()=>{onLike(song.id);close()}}><Heart size={14} fill={liked ? "currentColor" : "none"}/>{liked ? "Remove from Liked Songs" : "Add to Liked Songs"}</button>}
      {!mobile && onQueue&&<button onClick={()=>{onQueue();close()}}><ListOrdered size={14}/> Open queue</button>}
    </div>}
  </div>
}
function Card({song,liked,play,like,addToPlaylist,downloaded,downloadSong}){return <article className="card"><div className="cardCover"><Cover song={song}/><button className="cardPlay" onClick={()=>play(song)}><Play size={17} fill="currentColor"/></button><button className="cardLike" onClick={()=>like(song.id)} aria-label={liked?"Remove from Liked Songs":"Add to Liked Songs"}><Heart size={16} fill={liked?"currentColor":"none"}/></button></div><div className="cardTitle">{song.title}</div><div className="cardArtist">{song.artist}</div><div className="cardActions"><QueueMenu song={song} addToPlaylist={addToPlaylist} downloadSong={downloadSong} downloaded={downloaded}/></div></article>}
function Row({song,n,liked,play,like,stat,addToPlaylist,downloaded,downloadSong,removeFromPlaylist,playlistId,stats,livePlays}){
  const playCount=typeof stat==="number"?stat:(typeof stat==="string"?(parseInt(stat,10)||0):(getEffectivePlayCount(song,stats,livePlays))); 
  const hasLongText=song.title.length>36||song.artist.length>36;
  return <>{n===1&&<TrackListHeader/>}<div className={hasLongText?"row longTitle":"row"}><span className="rowNum">{n}</span><Cover song={song}/><div className="rowTitleCell"><button className="rowMain" onClick={()=>play(song)}><b>{song.title}</b><span>{song.artist}</span></button></div><span className="rowPlays">{formatPlayCount(playCount)}</span><span className="rowDuration">{fmt(song.duration||song.length)}</span><button className={liked?"heart liked":"heart"} onClick={()=>like(song.id)} aria-label={liked?"Remove from Liked Songs":"Add to Liked Songs"}><Heart size={16} fill={liked?"currentColor":"none"}/></button><button className="rowPlay" onClick={()=>play(song)} aria-label={`Play ${song.title}`}><Play size={14} fill="currentColor"/></button><QueueMenu song={song} addToPlaylist={addToPlaylist} downloadSong={downloadSong} downloaded={downloaded} removeFromPlaylist={removeFromPlaylist} playlistId={playlistId}/></div></>
}
function getEffectivePlayCount(song, stats = {}, livePlays = {}){
  return Number(song?.plays || 0) + Number(stats?.[song?.id]?.plays || 0) + Number(livePlays?.[song?.id] || 0);
}
function formatPlayCount(value){
  const num = Number(value) || 0;
  if (!num) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}
function Stat({icon:I,value,label}){return <div className="stat"><I size={19}/><b>{value}</b><span>{label}</span></div>}

if (import.meta.env.PROD && window.location.protocol !== "file:" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(assetUrl("/sw.js")).catch(() => {});
  });
}

const appPath=window.location.pathname.replace(/\/+$/g,"")||"/";
const isDesktop=window.location.protocol==="file:";
createRoot(document.getElementById("root")).render(isDesktop||appPath==="/app"?<App/>:<DevelopmentPreview/>);
