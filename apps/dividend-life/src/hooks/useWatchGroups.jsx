import { useState, useEffect, useCallback } from 'react';

const DEFAULT_WATCH_GROUPS = [
  {
    name: '現金流導向（月月配息）',
    ids: ['0056', '00878', '00919', '00731', '00918']
  },
  {
    name: '穩健成長 + 配息',
    ids: ['0056', '00878', '0050']
  },
  {
    name: '簡化操作（季配息）',
    ids: ['0056', '00878', '00919']
  }
];

export { DEFAULT_WATCH_GROUPS };

export default function useWatchGroups({ lang, setSelectedStockIds, handleResetFilters }) {
  const [watchGroups, setWatchGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupIndex, setEditingGroupIndex] = useState(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupIdsInput, setGroupIdsInput] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('watchGroups');
    if (stored) {
      try {
        setWatchGroups(JSON.parse(stored));
      } catch {
        setWatchGroups([]);
      }
    } else {
      setWatchGroups(DEFAULT_WATCH_GROUPS);
      localStorage.setItem('watchGroups', JSON.stringify(DEFAULT_WATCH_GROUPS));
    }
  }, []);

  const saveGroups = useCallback((groups) => {
    setWatchGroups(groups);
    localStorage.setItem('watchGroups', JSON.stringify(groups));
  }, []);

  const isGroupModified = useCallback((group) => {
    const def = DEFAULT_WATCH_GROUPS.find(g => g.name === group.name);
    if (!def) return true;
    const sortedDef = [...def.ids].sort();
    const sortedIds = [...group.ids].sort();
    if (sortedDef.length !== sortedIds.length) return true;
    return sortedIds.some((id, idx) => id !== sortedDef[idx]);
  }, []);

  const renderGroupName = useCallback((name) => {
    const map = {
      '現金流導向（月月配息）': lang === 'en' ? 'Cash Flow Focus (Monthly Dividends)' : '現金流導向（月月配息）',
      '穩健成長 + 配息': lang === 'en' ? 'Steady Growth + Dividends' : '穩健成長 + 配息',
      '簡化操作（季配息）': lang === 'en' ? 'Simplified Operation (Quarterly Dividends)' : '簡化操作（季配息）'
    };
    return map[name] || name;
  }, [lang]);

  const renderGroupOptionLabel = useCallback((group) => {
    if (!group) return '';
    const name = renderGroupName(group.name);
    if (!group.ids || group.ids.length === 0) return name;
    const ids = group.ids.join(', ');
    return lang === 'en' ? `${name} (${ids})` : `${name}（${ids}）`;
  }, [lang, renderGroupName]);

  const renderGroupIds = useCallback((group) => {
    const def = DEFAULT_WATCH_GROUPS.find(g => g.name === group.name);
    const defSet = def ? new Set(def.ids) : new Set();
    return group.ids.map((id, i) => (
      <span key={id} style={!def || !defSet.has(id) ? { color: 'red' } : {}}>
        {i > 0 && ', '}
        {id}
      </span>
    ));
  }, []);

  const handleGroupChange = useCallback((e) => {
    const name = e.target.value;
    handleResetFilters(true);
    setSelectedGroup(name);
    const group = watchGroups.find(g => g.name === name);
    if (group) {
      setSelectedStockIds(group.ids);
    } else {
      setSelectedStockIds([]);
    }
  }, [watchGroups, handleResetFilters, setSelectedStockIds]);

  const handleAddGroup = useCallback(() => {
    setEditingGroupIndex(-1);
    setGroupNameInput('');
    setGroupIdsInput('');
  }, []);

  const handleEditGroup = useCallback((idx) => {
    const group = watchGroups[idx];
    setEditingGroupIndex(idx);
    setGroupNameInput(group.name);
    setGroupIdsInput(group.ids.join(','));
  }, [watchGroups]);

  const handleSaveGroup = useCallback(() => {
    const idsArr = groupIdsInput.split(/[,\s]+/).filter(Boolean);
    if (editingGroupIndex === -1) {
      saveGroups([...watchGroups, { name: groupNameInput, ids: idsArr }]);
    } else {
      const group = watchGroups[editingGroupIndex];
      const newGroups = [...watchGroups];
      newGroups[editingGroupIndex] = { name: groupNameInput, ids: idsArr };
      saveGroups(newGroups);
      if (selectedGroup === group.name) {
        setSelectedGroup(groupNameInput);
        setSelectedStockIds(idsArr);
      }
    }
    setEditingGroupIndex(null);
    setGroupNameInput('');
    setGroupIdsInput('');
  }, [editingGroupIndex, groupIdsInput, groupNameInput, watchGroups, selectedGroup, saveGroups, setSelectedStockIds]);

  const handleCancelEditGroup = useCallback(() => {
    setEditingGroupIndex(null);
    setGroupNameInput('');
    setGroupIdsInput('');
  }, []);

  const handleDeleteGroup = useCallback((idx) => {
    if (!window.confirm(lang === 'en' ? 'Delete this group?' : '確定刪除?')) return;
    const group = watchGroups[idx];
    const newGroups = watchGroups.filter((_, i) => i !== idx);
    saveGroups(newGroups);
    if (selectedGroup === group.name) {
      setSelectedGroup('');
      setSelectedStockIds([]);
    }
  }, [lang, watchGroups, selectedGroup, saveGroups, setSelectedStockIds]);

  return {
    watchGroups,
    selectedGroup,
    showGroupModal,
    setShowGroupModal,
    editingGroupIndex,
    groupNameInput,
    setGroupNameInput,
    groupIdsInput,
    setGroupIdsInput,
    isGroupModified,
    renderGroupName,
    renderGroupOptionLabel,
    renderGroupIds,
    handleGroupChange,
    handleAddGroup,
    handleEditGroup,
    handleSaveGroup,
    handleCancelEditGroup,
    handleDeleteGroup,
  };
}
