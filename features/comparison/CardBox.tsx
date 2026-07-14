import { useState } from 'react';
import styled from 'styled-components';
import Skeleton from '@material-ui/lab/Skeleton';
import CachedIcon from '@material-ui/icons/Cached';
import { sortByOptions } from './sortByOptions';

interface CardBoxProps {
  card: Card;
  attributeLabel: string;
  attributeValue: string;
  attributeKey: string;
  loading: boolean;
  additionalDataToShow: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const formatAttribute = (attributeValue: string, usePercentage?: boolean) => {
  const style = usePercentage ? 'percent' : 'decimal';

  // 17Lands nulls out win rates for cards with small sample sizes (< 500 games)
  if (attributeValue === null || attributeValue === undefined || Number.isNaN(Number(attributeValue))) {
    return 'N/A';
  }

  return Number(attributeValue).toLocaleString(undefined, {
    style,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const CardBox: React.FC<CardBoxProps> = ({ card, attributeLabel, attributeValue, attributeKey, loading, additionalDataToShow }) => {
  const shouldUsePercentage = attributeLabel !== 'Average Last Seen At' && attributeLabel !== 'Average Pick Taken At';
  const attributeValueFormatted = formatAttribute(attributeValue, shouldUsePercentage);

  const [isFlipped, setIsFlipped] = useState(false);
  // Back image is only requested on first flip — avoids fetching back faces for cards
  // the user never flips. Once mounted, it stays so subsequent flips are instant.
  const [backRequested, setBackRequested] = useState(false);
  const hasBackFace = Boolean(card.url_back);

  const handleFlipCard = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setBackRequested(true);
    setIsFlipped((prev) => !prev);
  };

  return (
    <CardWrapper>
      <CardAttributes>
        <CardImageContainer>
          <CardFlipper $isFlipped={isFlipped}>
            <CardFace>
              <CardImage alt={card.name} title={card.name} src={card.url} loading="lazy" decoding="async" />
            </CardFace>
            {hasBackFace && (
              <CardBackFace>
                {backRequested && <CardImage alt={`${card.name} (back face)`} title={card.name} src={card.url_back} decoding="async" />}
              </CardBackFace>
            )}
          </CardFlipper>
          {hasBackFace && (
            <FlipButton
              type="button"
              onClick={handleFlipCard}
              aria-label={isFlipped ? `Show front of ${card.name}` : `Show back of ${card.name}`}
              title={isFlipped ? 'Show front face' : 'Show back face'}
            >
              <CachedIcon
                fontSize="small"
                style={{ transition: 'transform 0.25s ease-in-out', transform: isFlipped ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </FlipButton>
          )}
        </CardImageContainer>
        <CardName>
          {attributeLabel}
          <br />
          {loading ? (
            <div style={{ textAlign: 'center' }}>
              <Skeleton animation="wave" width="50px" style={{ display: 'inline-block' }} />
            </div>
          ) : (
            <>
              <>{attributeValueFormatted}</>
              <>
                {Object.keys(additionalDataToShow).map((key) => {
                  if (key === attributeKey) {
                    return null;
                  }
                  if (additionalDataToShow[key]) {
                    const cardMetaData = sortByOptions.find((option) => option.name === key);
                    const dataFormatted = formatAttribute(card[key], cardMetaData.usePercentage);
                    return (
                      <span style={{ opacity: '40%', whiteSpace: 'normal' }}>
                        {' '}
                        / {dataFormatted} ({cardMetaData?.shortLabel})
                      </span>
                    );
                  }
                })}
              </>
            </>
          )}
        </CardName>
      </CardAttributes>
    </CardWrapper>
  );
};

export interface Card {
  id: number;
  name: string;
  set: {
    name: string;
  };
  url: string;
  url_back?: string;
  attributeLabel: string;
  attributeValue: string;
}

const CardWrapper = styled.div({
  display: 'inline-block',
  fontSize: 'clamp(12px, 1.0vw, 22px)',
  height: 'auto',
  minHeight: '50px',
  lineHeight: 1.43,
  overflow: 'auto',
});

const CardAttributes = styled.div({ textAlign: 'center', maxWidth: '100%' });

const CardName = styled.div({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' });

// `perspective` only affects direct descendants, so it lives here (the flipper's
// parent) to give the rotation real 3D depth instead of a flat squish.
const CardImageContainer = styled.div({
  position: 'relative',
  perspective: '1400px',
});

const CardFlipper = styled.div<{ $isFlipped: boolean }>((props) => ({
  position: 'relative',
  transformStyle: 'preserve-3d',
  transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: props.$isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  willChange: 'transform',
}));

// The front face stays in normal flow so it keeps sizing the card box;
// the back face overlays it, pre-rotated so the flip reveals it upright.
const CardFace = styled.div({
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
});

const CardBackFace = styled.div({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  transform: 'rotateY(180deg)',
});

// Aspect ratio of a Magic card (Scryfall large images are 672x936) — reserves the slot's
// height before the image loads, so lazy loading doesn't collapse below-the-fold layout.
const CardImage = styled.img({ display: 'block', width: '100%', height: 'auto', aspectRatio: '672 / 936', borderRadius: '5%' });

const FlipButton = styled.button({
  position: 'absolute',
  top: '12%',
  right: '6%',
  zIndex: 2,
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  backdropFilter: 'blur(2px)',
  transition: 'background-color 0.15s ease-in-out, transform 0.15s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    transform: 'scale(1.08)',
  },
  '&:focus-visible': {
    outline: '2px solid #ffffff',
    outlineOffset: '2px',
  },
});

export default CardBox;
