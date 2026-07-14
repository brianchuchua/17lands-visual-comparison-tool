import { useEffect, useState } from 'react';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Popover from '@material-ui/core/Popover';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import SettingsIcon from '@material-ui/icons/Settings';
import Divider from '@material-ui/core/Divider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { getCardDataProxy } from '../network/features/comparison/getCardDataProxy';
import { getFiltersProxy } from '../network/features/comparison/getFiltersProxy';
import CardBox, { Card } from '../features/comparison/CardBox';
import AutocompleteWithNegation, { AutocompleteOption } from '../components/AutocompleteWithNegation';
import { sortByOptions } from '../features/comparison/sortByOptions';
import { timePeriodOptions } from '../features/comparison/timePeriodOptions';

const HomePage: React.FC = () => {
  const [selectableCards, setSelectableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedSortByOption, setSelectedSortByOption] = useState('ever_drawn_win_rate');

  const [selectedExpansion, setSelectedExpansion] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('PremierDraft');
  const [selectedDeckColors, setSelectedDeckColors] = useState('');

  const [selectedTimePeriod, setSelectedTimePeriod] = useState('ALL_TIME');

  const [settingsMenuAnchorElement, setSettingsMenuAnchorElement] = useState<null | HTMLElement>(null);
  const [viewAllCards, setViewAllCards] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [displayedCards, setDisplayedCards] = useState<AutocompleteOption[]>([]);
  const [selectedRarities, setSelectedRarities] = useState({
    mythic: true,
    rare: true,
    uncommon: true,
    common: true,
  });
  
  const [selectedColors, setSelectedColors] = useState({
    W: true,
    U: true,
    B: true,
    R: true,
    G: true,
    C: true,
  });

  const [additionalDataToShow, setAdditionalDataToShow] = useState({
    ever_drawn_win_rate: false,
    opening_hand_win_rate: false,
    drawn_win_rate: false,
    win_rate: false,
    never_drawn_win_rate: false,
    drawn_improvement_win_rate: false,
    avg_seen: false,
    avg_pick: false,
  });

  const [filters, setFilters] = useState({
    colors: [
      null,
      'W',
      'U',
      'B',
      'R',
      'G',
      'WU',
      'WB',
      'WR',
      'WG',
      'UB',
      'UR',
      'UG',
      'BR',
      'BG',
      'RG',
      'WUB',
      'WUR',
      'WUG',
      'WBR',
      'WBG',
      'WRG',
      'UBR',
      'UBG',
      'URG',
      'BRG',
      'WUBR',
      'WUBG',
      'WURG',
      'WBRG',
      'UBRG',
      'WUBRG',
    ],
    expansions: [
      'AFR',
      'STX',
      'KHM',
      'ZNR',
      'KLR',
      'M21',
      'AKR',
      'IKO',
      'THB',
      'ELD',
      'M20',
      'WAR',
      'RNA',
      'GRN',
      'M19',
      'DOM',
      'RIX',
      'XLN',
      'MH2',
      'MH1',
      '2XM',
      'TSR',
      'Ravnica',
      'CORE',
      'Cube',
    ],
    formats: [
      'PremierDraft',
      'TradDraft',
      'QuickDraft',
      'CompDraft',
      'Sealed',
      'TradSealed',
      'CubeDraft',
      'CubeSealed',
      'DraftChallenge',
      'OpenSealed_D1_Bo1',
      'OpenSealed_D1_Bo3',
      'OpenSealed_D2_Bo3',
    ],
  });

  useEffect(() => {
    const fetchFilters = async () => {
      const fetchedFilters = await getFiltersProxy();
      setFilters(fetchedFilters);
      setSelectedExpansion(fetchedFilters?.expansions?.[0]);
    };
    fetchFilters();
  }, []);

  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  useEffect(() => {
    const fetchCards = async () => {
      if (!selectedExpansion) {
        return;
      }
      setLoading(true);
      const fetchedCards =
        (await getCardDataProxy({
          expansion: selectedExpansion,
          format: selectedFormat,
          colors: selectedDeckColors,
          timePeriod: selectedTimePeriod,
        })) || [];
      setCards(fetchedCards);
      setSelectableCards(mapCardsToAutocompleteOption(fetchedCards));
      const updatedSelectedCards = selectedCards.map((card) => {
        const updatedCard = fetchedCards.find((fetchedCard) => fetchedCard.name === card.label);
        if (updatedCard) {
          card.data = updatedCard;
        }
        return card;
      });
      const sortedCards = [...updatedSelectedCards].sort(sortByCardAttribute);
      setSelectedCards(sortedCards);
      setLoading(false);
    };
    fetchCards();
  }, [selectedExpansion, selectedFormat, selectedDeckColors, selectedTimePeriod]);

  useEffect(() => {
    setSelectableCards(mapCardsToAutocompleteOption(cards));
  }, [cards]);

  useEffect(() => {
    const sortedCards = [...selectedCards].sort(sortByCardAttribute);
    setSelectedCards(sortedCards);
  }, [selectedSortByOption]);

  useEffect(() => {
    if (viewAllCards) {
      const filteredCards = selectableCards.filter(card => {
        const rarityMatch = !card.data.rarity || selectedRarities[card.data.rarity.toLowerCase()];
        
        let colorMatch = true;
        if (!card.data.color || card.data.color === "") {
          colorMatch = selectedColors.C;
        } else {
          const cardColors = card.data.color.split('');
          const selectedColorsList = Object.entries(selectedColors)
            .filter(([color, isSelected]) => color !== 'C' && isSelected)
            .map(([color]) => color);
            
          if (selectedColorsList.length === 0 && !selectedColors.C) {
            colorMatch = false;
          } else {
            colorMatch = cardColors.some(color => selectedColors[color]);
          }
        }
        
        return rarityMatch && colorMatch;
      });
      
      const sortedCards = [...filteredCards].sort(sortByCardAttribute);
      setDisplayedCards(sortedCards);
    } else {
      setDisplayedCards(selectedCards);
    }
  }, [cards, viewAllCards, selectedCards, selectableCards, selectedSortByOption, selectedRarities, selectedColors]);

  const sortByCardAttribute = (a, b) => {
    const attribute = selectedSortByOption;
    const sortDirection = attribute === 'avg_seen' || attribute === 'avg_pick' ? -1 : 1;
    if (a.data[attribute] > b.data[attribute]) {
      return -sortDirection;
    }
    if (a.data[attribute] < b.data[attribute]) {
      return sortDirection;
    }
    return 0;
  };

  const mapCardsToAutocompleteOption = (cardsToMap: Array<Card>): Array<AutocompleteOption> =>
    cardsToMap.map((card) => ({
      category: selectedExpansion,
      label: card.name,
      value: card.name,
      data: card,
      exclude: false,
    }));

  const updateSelectedCards = (newSelectedCards) => {
    if (viewAllCards) {
      const filteredCards = selectableCards.filter((card) => card.label.toLowerCase().includes(searchText.toLowerCase()));
      const sortedCards = [...filteredCards].sort(sortByCardAttribute);
      setDisplayedCards(sortedCards);
    } else {
      const sortedCards = [...newSelectedCards.filter((card) => !card.exclude)].sort(sortByCardAttribute);
      setSelectedCards(sortedCards);
      setDisplayedCards(sortedCards);
    }
  };

  const handleSortByOptionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newSortByOption = event.target.value as string;
    setSelectedSortByOption(newSortByOption);
  };

  const handleSelectedExpansionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newSelectedExpansion = event.target.value as string;
    setSelectedExpansion(newSelectedExpansion);
    setSelectedCards([]);
  };

  const handleSelectedFormatChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newSelectedFormat = event.target.value as string;
    setSelectedFormat(newSelectedFormat);
  };

  const handleSelectedTimePeriodChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newTimePeriod = event.target.value as string;
    setSelectedTimePeriod(newTimePeriod);
  };

  const handleSelectedDeckColorsChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newSelectedDeckColors = event.target.value as string;
    setSelectedDeckColors(newSelectedDeckColors);
  };

  const handleSettingsButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSettingsMenuAnchorElement(event.currentTarget);
  };

  const handleCloseSettingsMenu = () => {
    setSettingsMenuAnchorElement(null);
  };

  const handleAdditionalDataToShowChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAdditionalDataToShow({ ...additionalDataToShow, [event.target.name]: event.target.checked });
  };

  const handleRarityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRarities({ ...selectedRarities, [event.target.name]: event.target.checked });
  };
  
  const handleColorChange = (
    event: React.MouseEvent<HTMLElement>,
    newSelectedColors: string[]
  ) => {
    const updatedColors = {
      W: newSelectedColors.includes('W'),
      U: newSelectedColors.includes('U'),
      B: newSelectedColors.includes('B'),
      R: newSelectedColors.includes('R'),
      G: newSelectedColors.includes('G'),
      C: newSelectedColors.includes('C'),
    };
    setSelectedColors(updatedColors);
  };

  const handleViewAllCardsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newViewAllCards = event.target.checked;
    setViewAllCards(newViewAllCards);

    if (newViewAllCards) {
      const filteredCards = selectableCards.filter(card => {
        const matchesText = searchText === '' || card.label.toLowerCase().includes(searchText.toLowerCase());
        
        const matchesRarity = !card.data.rarity || selectedRarities[card.data.rarity.toLowerCase()];
        
        let matchesColor = true;
        if (!card.data.color || card.data.color === "") {
          matchesColor = selectedColors.C;
        } else {
          const cardColors = card.data.color.split('');
          const selectedColorsList = Object.entries(selectedColors)
            .filter(([color, isSelected]) => color !== 'C' && isSelected)
            .map(([color]) => color);
            
          if (selectedColorsList.length === 0 && !selectedColors.C) {
            matchesColor = false;
          } else {
            matchesColor = cardColors.some(color => selectedColors[color]);
          }
        }
        
        return matchesText && matchesRarity && matchesColor;
      });
      
      const sortedCards = [...filteredCards].sort(sortByCardAttribute);
      setDisplayedCards(sortedCards);
    } else {
      setDisplayedCards(selectedCards);
    }
  };

  const handleSearchTextChange = (newSearchText: string) => {
    setSearchText(newSearchText);

    if (viewAllCards) {
      const filteredCards = selectableCards.filter((card) => {
        const matchesText = card.label.toLowerCase().includes(newSearchText.toLowerCase());
        
        const matchesRarity = !card.data.rarity || selectedRarities[card.data.rarity.toLowerCase()];
        
        let matchesColor = true;
        if (!card.data.color || card.data.color === "") {
          matchesColor = selectedColors.C;
        } else {
          const cardColors = card.data.color.split('');
          const selectedColorsList = Object.entries(selectedColors)
            .filter(([color, isSelected]) => color !== 'C' && isSelected)
            .map(([color]) => color);
            
          if (selectedColorsList.length === 0 && !selectedColors.C) {
            matchesColor = false;
          } else {
            matchesColor = cardColors.some(color => selectedColors[color]);
          }
        }
        
        return matchesText && matchesRarity && matchesColor;
      });
      
      const sortedCards = [...filteredCards].sort(sortByCardAttribute);
      setDisplayedCards(sortedCards);
    }
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h3" component="h1" align="center">
        17Lands Visual Comparison
      </Typography>
      <Typography variant="subtitle1" align="center" color="textSecondary">
        <em>Because reading tables during a draft is hard! :) Data updates every 24 hours.</em>
      </Typography>
      <Grid container spacing={3} alignItems="center" justifyContent="center" style={{ marginTop: '10px' }}>
        <Grid item xs={12} sm={8} md={6}>
          {viewAllCards ? (
            <TextField
              fullWidth
              label="Filter cards"
              value={searchText}
              onChange={(e) => handleSearchTextChange(e.target.value)}
              placeholder={loading ? 'Loading...' : 'Type to filter cards'}
              inputProps={{ autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'none', spellCheck: 'false' }}
            />
          ) : (
            <AutocompleteWithNegation
              options={selectableCards}
              selectedOptions={selectedCards}
              setSelectedOptionsLocally={updateSelectedCards}
              setSelectedOptionsRemotely={noOp}
              label=""
              placeholder={loading ? 'Loading...' : 'Search for and add multiple cards to compare!'}
            />
          )}
        </Grid>
        <Grid>
          <IconButton size="small" aria-controls="settings-menu" aria-haspopup="true" onClick={handleSettingsButtonClick}>
            <SettingsIcon color="disabled" />
          </IconButton>
          <Popover
            id="settings-menu"
            anchorEl={settingsMenuAnchorElement}
            keepMounted
            open={Boolean(settingsMenuAnchorElement)}
            onClose={handleCloseSettingsMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
          >
            <div style={{ margin: '10px', padding: '10px' }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" disabled>
                  View options:
                </FormLabel>
                <FormControlLabel
                  control={<Switch checked={viewAllCards} onChange={handleViewAllCardsChange} name="viewAllCards" />}
                  label="View all cards in set"
                />
                {viewAllCards && (
                  <>
                    <Divider style={{ margin: '10px 0' }} />
                    <FormLabel component="legend" disabled>
                      Rarity filters:
                    </FormLabel>
                    <FormGroup row style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <FormControlLabel
                        control={<Switch checked={selectedRarities.mythic} onChange={handleRarityChange} name="mythic" />}
                        label="Mythic"
                      />
                      <FormControlLabel
                        control={<Switch checked={selectedRarities.rare} onChange={handleRarityChange} name="rare" />}
                        label="Rare"
                      />
                      <FormControlLabel
                        control={<Switch checked={selectedRarities.uncommon} onChange={handleRarityChange} name="uncommon" />}
                        label="Uncommon"
                      />
                      <FormControlLabel
                        control={<Switch checked={selectedRarities.common} onChange={handleRarityChange} name="common" />}
                        label="Common"
                      />
                    </FormGroup>
                    <Divider style={{ margin: '10px 0' }} />
                    <FormLabel component="legend" disabled>
                      Color filters:
                    </FormLabel>
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                      <ToggleButtonGroup
                        value={Object.keys(selectedColors).filter(color => selectedColors[color])}
                        onChange={handleColorChange}
                        aria-label="color filters"
                        size="small"
                      >
                        {Object.keys(selectedColors).map((color) => (
                          <ToggleButton 
                            key={color} 
                            value={color}
                            aria-label={color}
                            style={{ 
                              padding: '6px',
                              minWidth: '42px'
                            }}
                          >
                            <img
                              src={`https://svgs.scryfall.io/card-symbols/${color}.svg`}
                              alt={color}
                              style={{ 
                                height: '24px', 
                                width: '24px',
                                opacity: selectedColors[color] ? 1 : 0.4
                              }}
                            />
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </div>
                  </>
                )}
                <Divider style={{ margin: '10px 0' }} />
                <FormLabel component="legend" disabled>
                  Additionally show:
                </FormLabel>
                <FormGroup>
                  {Object.keys(additionalDataToShow).map((data) => {
                    const sortByOption = sortByOptions.find((option) => option.name === data);
                    const label = `${sortByOption?.label} (${sortByOption.shortLabel})`;
                    return (
                      <FormControlLabel
                        key={data}
                        control={<Switch checked={additionalDataToShow[data]} onChange={handleAdditionalDataToShowChange} name={data} />}
                        label={label}
                      />
                    );
                  })}
                </FormGroup>
              </FormControl>
            </div>
          </Popover>
        </Grid>
      </Grid>
      <Grid container spacing={3} alignItems="center" justifyContent="center" style={{ marginTop: '10px' }}>
        <Grid item>
          <FormControl>
            <InputLabel shrink>Expansion</InputLabel>
            <Select value={selectedExpansion} onChange={handleSelectedExpansionChange}>
              <MenuItem key="selectExpansion" value="" />
              {filters?.expansions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <FormControl>
            <InputLabel>Format</InputLabel>
            <Select value={selectedFormat} onChange={handleSelectedFormatChange}>
              {filters?.formats.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <FormControl>
            <InputLabel shrink>Deck Colors</InputLabel>
            <Select
              value={selectedDeckColors}
              onChange={handleSelectedDeckColorsChange}
              style={{ minWidth: '100px' }}
              placeholder="Colors"
              displayEmpty
            >
              <MenuItem key="selectColor" value="">
                Any Colors
              </MenuItem>
              {filters?.colors
                .filter((option) => option !== null)
                .map((option) => (
                  <MenuItem key={option} value={option}>
                    {option.split('').map((symbol, idx) => (
                      <img
                        key={idx}
                        src={`https://svgs.scryfall.io/card-symbols/${symbol}.svg`}
                        alt={symbol}
                        style={{ height: '20px', marginRight: '2px' }}
                      />
                    ))}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <FormControl>
            <InputLabel>Sort By</InputLabel>
            <Select value={selectedSortByOption} onChange={handleSortByOptionChange}>
              {sortByOptions.map((option) => (
                <MenuItem key={option.name} value={option.name}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <FormControl>
            <InputLabel>Time Period</InputLabel>
            <Select value={selectedTimePeriod} onChange={handleSelectedTimePeriodChange} style={{ minWidth: '100px' }}>
              {timePeriodOptions.map((option) => (
                <MenuItem key={option.name} value={option.name}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Grid container spacing={3} alignItems="center" justifyContent="center" style={{ marginTop: '10px' }}>
        <Grid container item xs={10} spacing={2} alignItems="center" justifyContent="center">
          {displayedCards.map((displayedCard) => {
            const sortByOption = sortByOptions.find((option) => option.name === selectedSortByOption);
            const card = cards?.find((c) => c.name === displayedCard?.data?.name);
            if (!card) {
              return null;
            }
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={3} key={displayedCard.data.name}>
                <CardBox
                  key={displayedCard.data.name}
                  card={card}
                  attributeLabel={sortByOption.label}
                  attributeValue={card[sortByOption.name]}
                  attributeKey={sortByOption.name}
                  loading={loading}
                  additionalDataToShow={additionalDataToShow}
                />
              </Grid>
            );
          })}
        </Grid>
      </Grid>
    </Container>
  );
};

export default HomePage;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};