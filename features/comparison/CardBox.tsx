import styled from 'styled-components';
import Skeleton from '@material-ui/lab/Skeleton';
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

  return (
    <CardWrapper>
      <CardAttributes>
        <CardImage alt={card.name} title={card.name} src={card.url} />
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

const CardImage = styled.img({ width: '100%', height: 'auto', borderRadius: '5%' });

export default CardBox;
