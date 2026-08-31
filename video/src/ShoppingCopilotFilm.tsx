import {Audio} from '@remotion/media';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {beats} from './storyboard.mjs';
import {AmbientWorld} from './components/AmbientWorld';
import {CaptionTrack} from './components/CaptionTrack';
import {HookWorld, ContractWorld} from './components/HookAndContract';
import {ConversationWorld} from './components/ConversationWorld';
import {MechanismWorld} from './components/MechanismWorld';
import {EvidenceWorld} from './components/EvidenceWorld';
import {
  CloseWorld,
  CommercialWorld,
  ExperimentWorld,
} from './components/ExperimentAndClose';
import {colors, fontFamily, monoFamily} from './styles';

export const ShoppingCopilotFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const beat = beats[Math.min(beats.length - 1, Math.floor(frame / 150))];
  const progress = frame / (durationInFrames - 1);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#080b12',
        color: '#f4f7fb',
        fontFamily,
        overflow: 'hidden',
      }}
    >
      <AmbientWorld />
      <Audio src={staticFile('audio/ambient.wav')} volume={0.72} />
      <Audio src={staticFile('audio/narration.wav')} volume={1} />
      <HookWorld />
      <ContractWorld />
      <ConversationWorld />
      <MechanismWorld />
      <EvidenceWorld />
      <ExperimentWorld />
      <CommercialWorld />
      <CloseWorld />

      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          bottom: 20,
          height: 3,
          left: 70,
          position: 'absolute',
          right: 70,
          zIndex: 60,
        }}
      >
        <div
          style={{
            background: `linear-gradient(90deg, ${colors.blue}, ${colors.violet})`,
            boxShadow: `0 0 14px ${colors.blue}`,
            height: 3,
            width: `${progress * 100}%`,
          }}
        />
      </div>
      <div
        style={{
          bottom: 27,
          color: colors.muted,
          fontFamily: monoFamily,
          fontSize: 12,
          left: 70,
          letterSpacing: 1,
          position: 'absolute',
          zIndex: 60,
        }}
      >
        {String(Math.floor(frame / 30 / 60)).padStart(2, '0')}:
        {String(Math.floor(frame / 30) % 60).padStart(2, '0')} / 03:00
      </div>
      <CaptionTrack kicker={beat.screenText} />
    </AbsoluteFill>
  );
};
