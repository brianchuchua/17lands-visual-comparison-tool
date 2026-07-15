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
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { getCardDataProxy } from '../network/features/comparison/getCardDataProxy';
import { getFiltersProxy } from '../network/features/comparison/getFiltersProxy';
import CardBox, { Card } from '../features/comparison/CardBox';
import AutocompleteWithNegation, { AutocompleteOption } from '../components/AutocompleteWithNegation';
import { sortByOptions } from '../features/comparison/sortByOptions';
import { timePeriodOptions } from '../features/comparison/timePeriodOptions';

const TYPE_DISPLAY_ORDER = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Land',
  'Planeswalker',
  'Battle',
  'Kindred',
  'Tribal',
  'Legendary',
  'Basic',
  'Snow',
];

// The API's `types` field holds full type lines like "Enchantment Creature - Saga Dragon"
// (one entry per card face); types/supertypes sit before the dash, subtypes after it.
const getCardTypeWords = (cardData, section: 'types' | 'subtypes'): string[] => {
  const words = [];
  (cardData?.types || []).forEach((typeLine) => {
    const segments = String(typeLine).split(/\s+[-—–]\s+|—/);
    const segment = section === 'types' ? segments[0] : segments.slice(1).join(' ');
    segment.split(/\s+/).forEach((word) => {
      if (word && words.indexOf(word) === -1) {
        words.push(word);
      }
    });
  });
  return words;
};

const getAllCardTypeWords = (cardData): string[] => {
  const words = getCardTypeWords(cardData, 'types');
  getCardTypeWords(cardData, 'subtypes').forEach((word) => {
    if (words.indexOf(word) === -1) {
      words.push(word);
    }
  });
  return words;
};

type TypeFilterState = 'include' | 'exclude';

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

  const [selectedTypes, setSelectedTypes] = useState<Record<string, TypeFilterState>>({});
  const [typeFilterMode, setTypeFilterMode] = useState<'OR' | 'AND'>('OR');
  const [showMoreTypes, setShowMoreTypes] = useState(false);

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

  // Every type/supertype present in the currently loaded set, in canonical display order
  const availableTypes = cards
    .reduce((typesInSet, card) => {
      getCardTypeWords(card, 'types').forEach((word) => {
        if (typesInSet.indexOf(word) === -1) {
          typesInSet.push(word);
        }
      });
      return typesInSet;
    }, [] as string[])
    .sort((a, b) => {
      const aIndex = TYPE_DISPLAY_ORDER.indexOf(a);
      const bIndex = TYPE_DISPLAY_ORDER.indexOf(b);
      if (aIndex === -1 && bIndex === -1) {
        return a.localeCompare(b);
      }
      if (aIndex === -1) {
        return 1;
      }
      if (bIndex === -1) {
        return -1;
      }
      return aIndex - bIndex;
    });

  // Every subtype (Hero, Villain, Equipment, Saga, ...) in the set — the exhaustive
  // list for synergy research, tucked behind the "Even more types" expander
  const availableSubtypes = cards
    .reduce((subtypesInSet, card) => {
      getCardTypeWords(card, 'subtypes').forEach((word) => {
        if (subtypesInSet.indexOf(word) === -1 && availableTypes.indexOf(word) === -1) {
          subtypesInSet.push(word);
        }
      });
      return subtypesInSet;
    }, [] as string[])
    .sort((a, b) => a.localeCompare(b));

  // Shown on the collapsed "Even more types" button so subtype filters can't hide while active
  const selectedSubtypeCount = availableSubtypes.filter((type) => selectedTypes[type]).length;

  // ✓ types combine with AND/OR per typeFilterMode; ✕ (NOT) types always exclude
  const matchesTypeFilters = (cardData) => {
    const includedTypes = Object.keys(selectedTypes).filter((type) => selectedTypes[type] === 'include');
    const excludedTypes = Object.keys(selectedTypes).filter((type) => selectedTypes[type] === 'exclude');
    if (includedTypes.length === 0 && excludedTypes.length === 0) {
      return true;
    }

    const cardTypeWords = getAllCardTypeWords(cardData);
    if (excludedTypes.some((type) => cardTypeWords.indexOf(type) !== -1)) {
      return false;
    }
    if (includedTypes.length === 0) {
      return true;
    }
    return typeFilterMode === 'AND'
      ? includedTypes.every((type) => cardTypeWords.indexOf(type) !== -1)
      : includedTypes.some((type) => cardTypeWords.indexOf(type) !== -1);
  };

  const cardMatchesFilters = (card, textToMatch) => {
    const matchesText = textToMatch === '' || card.label.toLowerCase().includes(textToMatch.toLowerCase());

    const matchesRarity = !card.data.rarity || selectedRarities[card.data.rarity.toLowerCase()];

    let matchesColor = true;
    if (!card.data.color || card.data.color === '') {
      matchesColor = selectedColors.C;
    } else {
      const cardColors = card.data.color.split('');
      const selectedColorsList = Object.entries(selectedColors)
        .filter(([color, isSelected]) => color !== 'C' && isSelected)
        .map(([color]) => color);

      if (selectedColorsList.length === 0 && !selectedColors.C) {
        matchesColor = false;
      } else {
        matchesColor = cardColors.some((color) => selectedColors[color]);
      }
    }

    return matchesText && matchesRarity && matchesColor && matchesTypeFilters(card.data);
  };

  useEffect(() => {
    if (viewAllCards) {
      const filteredCards = selectableCards.filter((card) => cardMatchesFilters(card, searchText));
      const sortedCards = [...filteredCards].sort(sortByCardAttribute);
      setDisplayedCards(sortedCards);
    } else {
      setDisplayedCards(selectedCards);
    }
  }, [
    cards,
    viewAllCards,
    selectedCards,
    selectableCards,
    selectedSortByOption,
    selectedRarities,
    selectedColors,
    selectedTypes,
    typeFilterMode,
    searchText,
  ]);

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
    // Each set has its own type list (especially subtypes), so carrying selections
    // across sets would leave invisible filters active
    setSelectedTypes({});
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

  const renderTypeFilterChip = (type: string) => {
    const typeState = selectedTypes[type];
    return (
      <ToggleButton
        key={type}
        value={type}
        size="small"
        selected={Boolean(typeState)}
        onChange={() => handleTypeFilterClick(type)}
        title={
          typeState === 'include'
            ? `Click to exclude ${type} cards`
            : typeState === 'exclude'
            ? `Click to stop filtering by ${type}`
            : `Click to require ${type}`
        }
        style={{
          padding: '2px 10px',
          textTransform: 'none',
          ...(typeState === 'exclude' ? { backgroundColor: 'rgba(244, 67, 54, 0.25)', textDecoration: 'line-through' } : {}),
        }}
      >
        {typeState === 'include' && <CheckIcon style={{ fontSize: '16px', marginRight: '4px' }} />}
        {typeState === 'exclude' && <CloseIcon style={{ fontSize: '16px', marginRight: '4px' }} />}
        {type}
      </ToggleButton>
    );
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

  // Re-filtering happens in the displayedCards effect above, which watches these states
  const handleViewAllCardsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setViewAllCards(event.target.checked);
  };

  const handleSearchTextChange = (newSearchText: string) => {
    setSearchText(newSearchText);
  };

  const handleTypeFilterClick = (type: string) => {
    setSelectedTypes((previousSelectedTypes) => {
      const updatedTypes = { ...previousSelectedTypes };
      if (!updatedTypes[type]) {
        updatedTypes[type] = 'include';
      } else if (updatedTypes[type] === 'include') {
        updatedTypes[type] = 'exclude';
      } else {
        delete updatedTypes[type];
      }
      return updatedTypes;
    });
  };

  const handleTypeFilterModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'OR' | 'AND' | null) => {
    if (newMode) {
      setTypeFilterMode(newMode);
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
                    {availableTypes.length > 0 && (
                      <>
                        <Divider style={{ margin: '10px 0' }} />
                        <FormLabel component="legend" disabled>
                          Type filters:
                        </FormLabel>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', maxWidth: '400px' }}>
                          {availableTypes.map(renderTypeFilterChip)}
                        </div>
                        {availableSubtypes.length > 0 && (
                          <>
                            <Button
                              size="small"
                              onClick={() => setShowMoreTypes(!showMoreTypes)}
                              style={{ textTransform: 'none', marginTop: '8px', alignSelf: 'flex-start', color: 'inherit', opacity: 0.7 }}
                              endIcon={
                                <ExpandMoreIcon
                                  style={{
                                    transition: 'transform 0.2s ease-in-out',
                                    transform: showMoreTypes ? 'rotate(180deg)' : 'rotate(0deg)',
                                  }}
                                />
                              }
                            >
                              Even more types ({availableSubtypes.length})
                              {!showMoreTypes && selectedSubtypeCount > 0 && ` — ${selectedSubtypeCount} active`}
                            </Button>
                            <Collapse in={showMoreTypes}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', maxWidth: '400px' }}>
                                {availableSubtypes.map(renderTypeFilterChip)}
                              </div>
                            </Collapse>
                          </>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                          <ToggleButtonGroup
                            value={typeFilterMode}
                            exclusive
                            onChange={handleTypeFilterModeChange}
                            aria-label="type filter combine mode"
                            size="small"
                          >
                            <ToggleButton value="OR" aria-label="match any type" style={{ padding: '2px 10px' }}>
                              OR
                            </ToggleButton>
                            <ToggleButton value="AND" aria-label="match all types" style={{ padding: '2px 10px' }}>
                              AND
                            </ToggleButton>
                          </ToggleButtonGroup>
                          <Typography variant="caption" color="textSecondary" style={{ marginLeft: '10px', maxWidth: '260px' }}>
                            {typeFilterMode === 'AND' ? 'Cards must have every ✓ type.' : 'Cards can have any ✓ type.'} ✕ types are
                            always excluded.
                          </Typography>
                        </div>
                      </>
                    )}
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