import { Table } from '@mantine/core';
import classes from './DataTable.module.css';

export type TableColumn = { key: string; label: string; numeric?: boolean };
export type TableData = { caption: string; columns: TableColumn[]; rows: Record<string, string>[] };

/** Табличный двойник графика: те же числа без наведения мыши. */
export function DataTable({ caption, columns, rows }: TableData) {
  return (
    <Table.ScrollContainer minWidth={360}>
      <Table highlightOnHover className={classes.table}>
        <caption className={classes.caption}>{caption}</caption>
        <Table.Thead>
          <Table.Tr>
            {columns.map((c) => (
              <Table.Th key={c.key} className={c.numeric ? classes.num : undefined}>
                {c.label}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, i) => (
            <Table.Tr key={i}>
              {columns.map((c) => (
                <Table.Td key={c.key} className={c.numeric ? classes.num : undefined}>
                  {row[c.key]}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
