import { Menu } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { currencyPhrase, currencySymbol } from '../domain/format';
import { useDrill, useFilters } from '../drill/hooks';
import { useRequiredSession } from '../session/store';
import { Token } from './QuerySentence';

/** «в тенге» — только если в выгрузке больше одной валюты. Валюты никогда не смешиваются. */
export function CurrencySlot() {
  const { dictionaries } = useRequiredSession();
  const { currency } = useFilters();
  const drill = useDrill();
  if (dictionaries.currencies.length <= 1) return null;
  return (
    <Menu position="bottom-start">
      <Menu.Target>
        <Token aria-haspopup="menu">{currencyPhrase(currency)}</Token>
      </Menu.Target>
      <Menu.Dropdown>
        {dictionaries.currencies.map((code) => (
          <Menu.Item key={code} leftSection={code === currency ? <IconCheck size={16} /> : <span style={{ width: 16 }} />} onClick={() => drill.setCurrency(code)}>
            {currencyPhrase(code)} ({currencySymbol(code)})
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
