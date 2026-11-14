import type { Register } from 'voidstrap';

const PAGE_ID = 'fluent-icon-browser';
const PAGE_SIZE = 48;
const SEARCH_DELAY_MS = 220;
const ALL_SIZES = 'All sizes';
const SIZES = [ALL_SIZES, '12', '16', '20', '24', '28', '32', '48'];

let icons: string[] | null = null;

const query = atom('query', '');
const sizeFilter = atom('sizeFilter', ALL_SIZES);
const page = atom('page', 0);
const status = atom('status', '');

let draft = '';
let searchTimer = 0;
let cacheKey = '';
let cacheList: string[] = [];

function sizeOf(name: string): string {
  const match = /(\d+)$/.exec(name);
  return match ? match[1] : '';
}

function allIcons(): string[] {
  if (icons === null)
    icons = $.app.icons();
  return icons;
}

function filtered(text: string, size: string): string[] {
  const key = size + '|' + text;
  if (key === cacheKey)
    return cacheList;
  const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  cacheList = allIcons().filter(name => {
    if (size !== ALL_SIZES && sizeOf(name) !== size)
      return false;
    const lower = name.toLowerCase();
    return words.every(word => lower.includes(word));
  });
  cacheKey = key;
  return cacheList;
}

function pageCount(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

function search(text: string) {
  draft = text;
  if (searchTimer !== 0)
    $.clock.cancel(searchTimer);
  searchTimer = $.clock.after(SEARCH_DELAY_MS, () => {
    searchTimer = 0;
    update($, query, () => draft);
    update($, page, () => 0);
  });
}

function copy(text: string, message: string) {
  $.clipboard.set(text);
  update($, status, () => message);
}

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    $.modpages.add({ id: PAGE_ID, title: 'Fluent Icon Browser', icon: 'assets/icon.png' });
    return next(e);
  });

  on('ui.render', { component: 'Page', requestId: PAGE_ID }, ($) => {
    const { Box, Grid, Text, TextInput, Select, Button, Badge, Wrap, Scroll } = $.ui.resolve();

    const list = filtered(read($, query), read($, sizeFilter));
    const count = list.length;
    const pages = pageCount(count);
    const current = Math.min(Math.max(0, read($, page)), pages - 1);
    const slice = list.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
    const message = read($, status);

    return (
      <Scroll>
        <Box direction="column" padding={16} gap={12}>
          <Grid columns={['*', 'auto']} gap={8}>
            <Box column={0} direction="row" gap={10} align="left" verticalAlignment="center">
              <Text bold size={20}>Fluent Icon Browser</Text>
              <Badge text={count + ' icons'} variant="primary" />
            </Box>
            <Button column={1} key="copy-all" icon="Copy24" label={'Copy ' + count + ' names'} variant="secondary"
              disabled={count === 0}
              onPress={() => copy(list.join('\n'), 'Copied ' + count + ' icon names')} />
          </Grid>

          <Text dim size={12}>Click any icon to copy its exact name. Use it as the icon of a mod page, sidebar item or button.</Text>

          <Grid columns={['*', 160]} gap={8}>
            <TextInput column={0} key="search" value={draft} placeholder="Search icons, for example folder chevron or shield"
              onChange={search} onSubmit={search} />
            <Select column={1} key="size" options={SIZES} selected={read($, sizeFilter)}
              onChange={(value) => { update($, sizeFilter, () => value); update($, page, () => 0); }} />
          </Grid>

          {message !== '' && <Text dim size={11}>{message}</Text>}

          {count === 0
            ? <Text dim>No icons match "{read($, query)}".</Text>
            : (
              <Wrap itemWidth={232} itemHeight={44}>
                {slice.map(name => (
                  <Button key={'icon-' + name} icon={name} label={name} variant="transparent" align="stretch"
                    margin={2} tooltip={name}
                    onPress={() => copy(name, 'Copied ' + name)} />
                ))}
              </Wrap>
            )}

          <Box direction="row" gap={8} align="center" verticalAlignment="center">
            <Button key="first" icon="ArrowPrevious24" tooltip="First page" disabled={current === 0}
              onPress={() => update($, page, () => 0)} />
            <Button key="prev" icon="ChevronLeft24" tooltip="Previous page" disabled={current === 0}
              onPress={() => update($, page, () => current - 1)} />
            <Text dim size={12} verticalAlignment="center" margin="8,0">Page {current + 1} of {pages}</Text>
            <Button key="next" icon="ChevronRight24" tooltip="Next page" disabled={current >= pages - 1}
              onPress={() => update($, page, () => current + 1)} />
            <Button key="last" icon="ArrowNext24" tooltip="Last page" disabled={current >= pages - 1}
              onPress={() => update($, page, () => pages - 1)} />
          </Box>
        </Box>
      </Scroll>
    );
  });
};
