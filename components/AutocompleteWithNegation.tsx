import { Dispatch, SetStateAction } from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Chip from '@material-ui/core/Chip';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Zoom from '@material-ui/core/Zoom';

export interface AutocompleteOption {
  category: string;
  label: string;
  value: string;
  exclude: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

interface AutocompleteWithNegationProps {
  options: AutocompleteOption[];
  selectedOptions: AutocompleteOption[];
  setSelectedOptionsLocally: Dispatch<SetStateAction<AutocompleteOption[]>>;
  setSelectedOptionsRemotely: (newSelectedOptions: AutocompleteOption[]) => void;
  label: string;
  placeholder: string;
}

const AutocompleteWithNegation: React.FC<AutocompleteWithNegationProps> = ({
  options,
  selectedOptions,
  setSelectedOptionsLocally,
  setSelectedOptionsRemotely,
  label,
  placeholder,
}) => (
  <Autocomplete
    multiple
    filterSelectedOptions
    autoComplete
    options={options}
    groupBy={(option) => option.category}
    getOptionLabel={(option) => option.label}
    getOptionSelected={(option, value) => option.value === value.value}
    renderInput={(params) => (
      <TextField
        autoFocus
        {...params}
        label={label}
        variant="outlined"
        placeholder={placeholder}
        inputProps={{ ...params.inputProps, autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'none', spellCheck: 'false' }}
      />
    )}
    onChange={(e, newSelectedOptions: AutocompleteOption[]) => {
      setSelectedOptionsLocally(newSelectedOptions);
      setSelectedOptionsRemotely(newSelectedOptions);
    }}
    value={selectedOptions}
    renderTags={(autocompleteOptions: AutocompleteOption[], getTagProps) =>
      autocompleteOptions.map((option: AutocompleteOption, index: number) => {
        // <Tooltip
        //   key={option.value}
        //   TransitionComponent={Zoom}
        //   title={option.exclude ? '(Click to include this option)' : '(Click to exclude this option)'}
        // >
        if (!option) {
          return null;
        }
        return (
          <Chip
            label={option.label}
            {...getTagProps({ index })}
            color={option.exclude ? 'default' : 'primary'}
            clickable
            onClick={() => {
              const clickedOption = { ...selectedOptions[index] };
              clickedOption.exclude = !clickedOption.exclude;

              const updatedOptions = [...selectedOptions];
              updatedOptions[index] = clickedOption;

              setSelectedOptionsLocally(updatedOptions);
              setSelectedOptionsRemotely(updatedOptions);
            }}
            style={{ textDecoration: option.exclude ? 'line-through' : '' }}
          />
        );
        // </Tooltip>
      })
    }
  />
);

export default AutocompleteWithNegation;
