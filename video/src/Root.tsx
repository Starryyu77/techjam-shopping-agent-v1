import {Composition, Folder} from 'remotion';
import {DURATION_FRAMES, FPS} from './storyboard.mjs';
import {ShoppingCopilotFilm} from './ShoppingCopilotFilm';
import {ShoppingCopilotFilmV2, ShoppingCopilotFilmV2Bilingual} from './v2/ShoppingCopilotFilmV2';
import {
  CinematicDocumentaryPreview,
  EditorialAtelierPreview,
  EditorialSocialCommercePreview,
  NocturneLuxePreview,
} from './v3/StylePreview';
import {ShoppingCopilotFilmV3} from './v3/ShoppingCopilotFilmV3';
import {V3_DURATION_FRAMES, V3_FPS} from './v3/storyboard-v3.mjs';

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Shopping-Copilot">
      <Composition
        id="ShoppingCopilotFilm"
        component={ShoppingCopilotFilm}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ShoppingCopilotFilmV2"
        component={ShoppingCopilotFilmV2}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ShoppingCopilotFilmV2Bilingual"
        component={ShoppingCopilotFilmV2Bilingual}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="V3StyleEditorialAtelier"
        component={EditorialAtelierPreview}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="V3StyleEditorialSocialCommerce"
        component={EditorialSocialCommercePreview}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="V3StyleNocturneLuxe"
        component={NocturneLuxePreview}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="V3StyleCinematicDocumentary"
        component={CinematicDocumentaryPreview}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ShoppingCopilotFilmV3"
        component={ShoppingCopilotFilmV3}
        durationInFrames={V3_DURATION_FRAMES}
        fps={V3_FPS}
        width={1920}
        height={1080}
      />
    </Folder>
  );
};
