const selectStyles = {
  control: provided => ({
    ...provided,
    backgroundColor: 'var(--color-card-bg)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)'
  }),
  input: provided => ({
    ...provided,
    color: 'var(--color-text)'
  }),
  singleValue: provided => ({
    ...provided,
    color: 'var(--color-text)'
  }),
  menu: provided => ({
    ...provided,
    backgroundColor: 'var(--color-card-bg)',
    color: 'var(--color-text)',
    zIndex: 1100
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'var(--color-row-even)' : 'var(--color-card-bg)',
    color: 'var(--color-text)'
  })
};

export default selectStyles;
