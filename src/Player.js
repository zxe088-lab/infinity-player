import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, Pressable, ScrollView, AppState} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';
import {useEvent} from 'expo';
import {Ionicons} from '@expo/vector-icons';
import {createCheckpoint} from './playback.mjs';
export default function Player({item, progress=0, onClose, onProgress}) {
  const [attempt,setAttempt] = useState(0);
  const latest = useRef(progress);
  return <Playback key={`${item.key}-${attempt}`} item={item} progress={latest.current} onClose={onClose} onProgress={seconds=>{latest.current=seconds;onProgress(seconds);}} onRetry={()=>setAttempt(x=>x+1)}/>;
}
function Playback({item,progress,onClose,onProgress,onRetry}) {
  const resumed = useRef(false);
  const callback = useRef(onProgress); callback.current = onProgress;
  const checkpoint = useRef(null);
  if (!checkpoint.current) checkpoint.current=createCheckpoint(progress,seconds=>callback.current(seconds));
  const source = useMemo(()=>item.demo ? require('../assets/demo.mp4') : {uri:item.url,contentType:item.kind==='live' || /\.m3u8(?:[?#]|$)/i.test(item.url || '') ? 'hls':'auto'},[item.demo,item.url,item.kind]);
  const player = useVideoPlayer(source,p=>{p.timeUpdateEventInterval=5;p.play();});
  const {status} = useEvent(player,'statusChange',{status:player.status});
  const {isPlaying} = useEvent(player,'playingChange',{isPlaying:player.playing});
  const [subtitle,setSubtitle] = useState('off'); const [audio,setAudio] = useState('');
  useEffect(()=>{
    const sub = player.addListener('timeUpdate',e=>{
      if (item.kind==='live' || player.isLive || !resumed.current) return;
      checkpoint.current.update(e.currentTime);
    });
    const ended = player.addListener('playToEnd',()=>{if(item.kind!=='live' && !player.isLive) checkpoint.current.finish();});
    const app = AppState.addEventListener('change',s=>{if(s!=='active') {if(item.kind!=='live' && !player.isLive && resumed.current) {checkpoint.current.update(player.currentTime);checkpoint.current.flush();}player.pause();}});
    return ()=>{sub.remove();ended.remove();app.remove();if(item.kind!=='live') checkpoint.current.flush();};
  },[player,item.kind]);
  useEffect(()=>{
    if(status==='readyToPlay' && !resumed.current) {
      resumed.current=true;
      if(progress>0 && item.kind!=='live' && !player.isLive && player.duration>progress+10) player.currentTime=progress;
    }
  },[status,player,progress,item.kind]);
  const tracks = status==='readyToPlay' ? player.availableSubtitleTracks || [] : [];
  const audioTracks = status==='readyToPlay' ? player.availableAudioTracks || [] : [];
  return <ScrollView style={s.page} contentContainerStyle={{paddingBottom:30}}>
    <View style={s.header}><Pressable accessibilityLabel="إغلاق المشغّل" onPress={onClose} style={s.button}><Ionicons name="chevron-forward" color="white" size={24}/></Pressable><Text style={s.title}>{item.name}</Text></View>
    <VideoView player={player} style={s.video} nativeControls allowsFullscreen contentFit="contain"/>
    <Text style={s.status}>{status==='loading'?'جارٍ تحميل الفيديو…':status==='error'?'تعذّر تشغيل الفيديو. تحقق من صلاحية المصدر وتوافق صيغة الصوت والفيديو.':item.kind==='live'?'بث مباشر':'تشغيل الفيديو'}</Text>
    {status==='error' && <Pressable style={s.button} onPress={()=>{checkpoint.current.flush();onRetry();}}><Text style={s.label}>إعادة المحاولة</Text></Pressable>}
    <View style={s.row}>
      {item.kind!=='live' && <Pressable style={s.button} onPress={()=>player.seekBy(-10)}><Text style={s.label}>−10 ثوانٍ</Text></Pressable>}
      <Pressable style={s.button} onPress={()=>isPlaying?player.pause():player.play()}><Ionicons name={isPlaying?'pause':'play'} size={26} color="#66e5cc"/></Pressable>
      {item.kind!=='live' && <Pressable style={s.button} onPress={()=>player.seekBy(10)}><Text style={s.label}>+10 ثوانٍ</Text></Pressable>}
    </View>
    {tracks.length>0 && <><Text style={s.section}>الترجمة</Text><View style={s.row}><Pressable style={s.button} onPress={()=>{player.subtitleTrack=null;setSubtitle('off');}}><Text style={[s.label,subtitle==='off'&&s.active]}>إيقاف</Text></Pressable>{tracks.map((t,i)=><Pressable key={i} style={s.button} onPress={()=>{player.subtitleTrack=t;setSubtitle(String(i));}}><Text style={[s.label,subtitle===String(i)&&s.active]}>{t.label || t.language || `ترجمة ${i+1}`}</Text></Pressable>)}</View></>}
    {audioTracks.length>1 && <><Text style={s.section}>المسار الصوتي</Text><View style={s.row}>{audioTracks.map((t,i)=><Pressable key={i} style={s.button} onPress={()=>{player.audioTrack=t;setAudio(String(i));}}><Text style={[s.label,audio===String(i)&&s.active]}>{t.label || t.language || `صوت ${i+1}`}</Text></Pressable>)}</View></>}
    <Text style={s.note}>جودة البث والمسارات المتاحة يحددها المصدر. لا يتم تسجيل الفيديو أو تنزيله.</Text>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#0b101b'},header:{flexDirection:'row-reverse',alignItems:'center',padding:16,gap:12},title:{color:'white',fontSize:19,fontWeight:'700',flex:1,textAlign:'right'},video:{width:'100%',aspectRatio:16/9,backgroundColor:'#000'},button:{padding:14,borderRadius:14,backgroundColor:'#1b2639',alignItems:'center'},label:{color:'#e4e9f2'},row:{flexDirection:'row-reverse',flexWrap:'wrap',justifyContent:'center',gap:10,padding:16},status:{color:'#a7b6c9',textAlign:'center',padding:20,lineHeight:23},section:{color:'white',fontSize:17,textAlign:'right',paddingHorizontal:20},note:{color:'#8391a7',textAlign:'center',lineHeight:23,padding:20},active:{color:'#66e5cc'}});
