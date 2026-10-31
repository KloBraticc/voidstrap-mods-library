import type { Register } from 'voidstrap';

type TopbarMode = 'dropdown' | 'labels' | 'icons';
type HomeSections = {
  releaseBanner: boolean;
  robloxNews: boolean;
  catalog: boolean;
  continuePlaying: boolean;
};
type LibrarySections = {
  events: boolean;
  whatsNew: boolean;
  recentGames: boolean;
  allGames: boolean;
  sidebarRedesign: boolean;
};

const topbarMode = atom<TopbarMode>('topbarMode', 'labels');
const defaultHomeSections: HomeSections = {
  releaseBanner: true,
  robloxNews: true,
  catalog: true,
  continuePlaying: true,
};
const homeSections = atom<HomeSections>('homeSections', defaultHomeSections);
const defaultLibrarySections: LibrarySections = {
  events: true,
  whatsNew: true,
  recentGames: true,
  allGames: true,
  sidebarRedesign: true,
};
const librarySections = atom<LibrarySections>('librarySections', defaultLibrarySections);

const isLibraryPage = (page: unknown): boolean =>
  typeof page === 'string' && page.toLowerCase().includes('library');

const navItems = [
  { id: 'home', label: 'Home', icon: 'Home24', page: 'HomePage', width: 80 },
  { id: 'library', label: 'Library', icon: 'Apps24', page: 'LibraryPage', width: 85 },
  { id: 'servers', label: 'Private Servers', icon: 'Server24', page: 'PrivateServersPage', width: 130 },
  { id: 'mods', label: 'Voidstrap Mods', icon: 'PuzzlePiece24', page: 'VoidstrapModsPage', width: 135 },
  { id: 'news', label: 'News', icon: 'News24', page: 'NewsPage', width: 75 },
] as const;

const setHomeRule = ($: any, id: string, target: Record<string, unknown>, hide: boolean) => {
  if (hide) {
    $.ui.rule({
      id,
      target: { page: 'HomePage', ...target },
      set: { hidden: true }
    });
  } else {
    $.ui.undo(id);
  }
};

const nodeHasText = (node: any, phrase: string): boolean => {
  if (typeof node?.text === 'string' && node.text.toLowerCase().includes(phrase.toLowerCase())) return true;
  for (const child of node?.children || []) {
    if (nodeHasText(child, phrase)) return true;
  }
  return false;
};

const nodeCount = (node: any): number => {
  let count = 1;
  for (const child of node?.children || []) count += nodeCount(child);
  return count;
};

const setPageGridRule = ($: any, page: string, id: string, phrase: string, hide: boolean) => {
  if (!hide) {
    $.ui.undo(id);
    return;
  }
  const grids = $.ui.query({ page, type: 'Grid' });
  let bestIndex = -1;
  let bestSize = Number.MAX_SAFE_INTEGER;
  for (let index = 0; index < grids.length; index++) {
    if (nodeHasText(grids[index], phrase)) {
      const size = nodeCount(grids[index]);
      if (size < bestSize) {
        bestIndex = index;
        bestSize = size;
      }
    }
  }
  if (bestIndex >= 0) {
    $.ui.rule({ id, target: { page, type: 'Grid', index: bestIndex }, set: { hidden: true } });
  }
};

const setHomeGridRule = ($: any, id: string, phrase: string, hide: boolean) =>
  setPageGridRule($, 'HomePage', id, phrase, hide);

const setHomeNewsCardRules = ($: any, hide: boolean) => {
  const cards = $.ui.query({ page: 'HomePage', name: 'NewsCard' });
  const previousCount = $.store.get('ui-tweaks.homeNewsCardRuleCount');
  const count = typeof previousCount === 'number' ? Math.max(previousCount, cards.length) : cards.length;
  if (!hide) {
    for (let index = 1; index < count; index++) $.ui.undo('home-hide-news-card-' + index);
    $.store.set('ui-tweaks.homeNewsCardRuleCount', 0);
    return;
  }
  for (let index = 1; index < cards.length; index++) {
    $.ui.rule({
      id: 'home-hide-news-card-' + index,
      target: { page: 'HomePage', name: 'NewsCard', index },
      set: { hidden: true }
    });
  }
  $.store.set('ui-tweaks.homeNewsCardRuleCount', cards.length);
};

const setHomeVisualCardRules = ($: any, id: string, hide: boolean, section: 'catalog' | 'history') => {
  const target = { page: 'HomePage', name: 'ContentBorder', ancestor: 'PART_FrameCP' };
  const cards = $.ui.query(target);
  const previousCount = $.store.get('ui-tweaks.' + id + 'RuleCount');
  const count = typeof previousCount === 'number' ? Math.max(previousCount, cards.length) : cards.length;
  if (!hide) {
    for (let index = 0; index < count; index++) $.ui.undo(id + '-' + index);
    $.store.set('ui-tweaks.' + id + 'RuleCount', 0);
    return;
  }

  const widthCutoff = Math.max(250, Math.min(500, $.window.get().width * 0.25));
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const isCatalogCard = card.width >= 200 && card.width < widthCutoff && card.height > 100;
    const isHistoryCard = card.width >= widthCutoff && card.height > 180;
    if ((section === 'catalog' && isCatalogCard) || (section === 'history' && isHistoryCard)) {
      $.ui.rule({
        id: id + '-' + index,
        target: { ...target, index },
        set: { hidden: true }
      });
    }
  }
  $.store.set('ui-tweaks.' + id + 'RuleCount', cards.length);
};

const setHomeHeaderChevronRules = ($: any, options: HomeSections) => {
  const frame = { page: 'HomePage', ancestor: 'PART_FrameCP' };
  const hovers = $.ui.query({ ...frame, name: 'HoverLayer' });
  const presses = $.ui.query({ ...frame, name: 'PressLayer' });
  const presenters = $.ui.query({ ...frame, type: 'ContentPresenter' });
  const rightEdge = $.window.get().width * 0.85;
  const bottomEdge = $.window.get().height * 0.85;
  const buttons = hovers
    .map((node: any, index: number) => ({ node, index }))
    .filter(({ node }: any) =>
      typeof node.x === 'number' && node.x >= rightEdge &&
      typeof node.y === 'number' && node.y < bottomEdge &&
      typeof node.width === 'number' && node.width <= 40 &&
      typeof node.height === 'number' && node.height <= 25
    )
    .sort((a: any, b: any) => a.node.y - b.node.y)
    .slice(0, 2);

  for (let section = 0; section < 2; section++) {
    const isNews = section === 0;
    const hidden = isNews ? !options.robloxNews : !options.catalog;
    const prefix = isNews ? 'home-hide-news-chevron-' : 'home-hide-catalog-chevron-';
    const button = buttons[section];
    const ids = [prefix + 'hover', prefix + 'press', prefix + 'content-0', prefix + 'content-1'];
    if (!hidden) {
      for (const id of ids) $.ui.undo(id);
      continue;
    }
    if (!button) continue;

    $.ui.rule({ id: ids[0], target: { ...frame, name: 'HoverLayer', index: button.index }, set: { hidden: true } });
    const press = presses[button.index];
    if (press) {
      const pressIndex = presses.indexOf(press);
      $.ui.rule({ id: ids[1], target: { ...frame, name: 'PressLayer', index: pressIndex }, set: { hidden: true } });
    }

    const within = presenters
      .map((node: any, index: number) => ({ node, index }))
      .filter(({ node }: any) =>
        typeof node.x === 'number' && node.x >= button.node.x - 2 && node.x <= button.node.x + button.node.width + 2 &&
        typeof node.y === 'number' && node.y >= button.node.y - 2 && node.y <= button.node.y + button.node.height + 2
      )
      .sort((a: any, b: any) => a.node.x - b.node.x);
    for (let index = 0; index < Math.min(2, within.length); index++) {
      $.ui.rule({
        id: ids[index + 2],
        target: { ...frame, type: 'ContentPresenter', index: within[index].index },
        set: { hidden: true }
      });
    }
  }
};

const applyHomeSections = ($: any, options: HomeSections) => {
  $.ui.undo('home-hide-news-chevron-border');
  $.ui.undo('home-hide-catalog-chevron-border');
  setHomeHeaderChevronRules($, options);
  setHomeRule($, 'home-hide-release-banner', { name: 'NewsCard', index: 0 }, !options.releaseBanner);

  setHomeGridRule($, 'home-hide-news-header-row', 'Latest Roblox News', !options.robloxNews);
  setHomeRule($, 'home-hide-news-heading', { text: 'Latest Roblox News' }, !options.robloxNews);
  setHomeRule($, 'home-hide-news-count', { textContains: 'new)' }, !options.robloxNews);
  setHomeRule($, 'home-hide-news-explore', { text: 'Explore all news' }, !options.robloxNews);
  setHomeRule($, 'home-hide-news-explore-button', { type: 'Button', textContains: 'Explore all news' }, !options.robloxNews);
  setHomeNewsCardRules($, !options.robloxNews);
  setHomeRule($, 'home-hide-news-items-control', { type: 'ItemsControl', index: 0 }, !options.robloxNews);
  setHomeRule($, 'home-hide-news-uniform-grid', { type: 'UniformGrid', index: 0 }, !options.robloxNews);

  setHomeGridRule($, 'home-hide-catalog-header-row', 'New on the Catalog', !options.catalog);
  setHomeRule($, 'home-hide-catalog-heading', { text: 'New on the Catalog' }, !options.catalog);
  setHomeRule($, 'home-hide-catalog-more', { text: 'See more' }, !options.catalog);
  setHomeRule($, 'home-hide-catalog-more-button', { type: 'Button', textContains: 'See more' }, !options.catalog);
  setHomeRule($, 'home-hide-catalog-loading', { text: 'Loading new catalog items...' }, !options.catalog);
  setHomeRule($, 'home-hide-catalog-empty', { text: 'No new catalog items right now.' }, !options.catalog);
  setHomeVisualCardRules($, 'home-hide-catalog-card', !options.catalog, 'catalog');
  setHomeRule($, 'home-hide-catalog-items-control', { type: 'ItemsControl', index: 1 }, !options.catalog);
  setHomeRule($, 'home-hide-catalog-uniform-grid', { type: 'UniformGrid', index: 1 }, !options.catalog);

  setHomeGridRule($, 'home-hide-playing-header-row', 'Continue Playing', !options.continuePlaying);
  setHomeRule($, 'home-hide-playing-heading', { text: 'Continue Playing' }, !options.continuePlaying);
  setHomeRule($, 'home-hide-global-server-label', { text: 'Server for every game' }, !options.continuePlaying);
  setHomeRule($, 'home-hide-global-server-picker', { type: 'ComboBox', all: true }, !options.continuePlaying);
  setHomeRule($, 'home-hide-global-server-action', { text: 'Use for all games' }, !options.continuePlaying);
  setHomeRule($, 'home-hide-global-server-action-button', { type: 'Button', textContains: 'Use for all games' }, !options.continuePlaying);
  setHomeRule($, 'home-hide-history-empty', { text: 'No history yet' }, !options.continuePlaying);
  setHomeRule($, 'home-hide-history-empty-description', { text: 'Games you play will show up here so you can jump back in.' }, !options.continuePlaying);
  setHomeRule($, 'home-hide-filtered-empty', { text: 'No matches' }, !options.continuePlaying);
  setHomeRule($, 'home-hide-filtered-empty-description', { text: 'Nothing in your history matches that search.' }, !options.continuePlaying);
  setHomeVisualCardRules($, 'home-hide-playing-card', !options.continuePlaying, 'history');
  setHomeRule($, 'home-hide-history-items-control', { type: 'ItemsControl', index: 2 }, !options.continuePlaying);
  setHomeRule($, 'home-hide-history-uniform-grid', { type: 'UniformGrid', index: 2 }, !options.continuePlaying);
};

const setLibraryRule = ($: any, id: string, target: Record<string, unknown>, hide: boolean) => {
  if (hide) {
    $.ui.rule({ id, target: { page: 'LibraryPage', ...target }, set: { hidden: true } });
  } else {
    $.ui.undo(id);
  }
};

const applyLibrarySidebar = ($: any, redesign: boolean) => {
  const rules = [
    'library-sidebar-group-root',
    'library-sidebar-group-items',
    'library-sidebar-group-toggle',
    'library-sidebar-resizer',
    'library-sidebar-list',
    'library-sidebar-home-label',
    'library-sidebar-game-icons',
    'library-sidebar-game-icons-rounded',
    'library-sidebar-row-rounded',
    'library-sidebar-row-content-spacing',
  ];
  if (!redesign) {
    for (const id of rules) $.ui.undo(id);
    return;
  }
  $.ui.rule({ id: 'library-sidebar-group-root', target: { page: 'LibraryPage', name: 'GroupRoot', all: true }, set: { margin: '0' } });
  $.ui.rule({ id: 'library-sidebar-group-items', target: { page: 'LibraryPage', name: 'GroupItemsHost', all: true }, set: { margin: '0' } });
  $.ui.rule({ id: 'library-sidebar-group-toggle', target: { page: 'LibraryPage', name: 'GroupToggle', all: true }, set: { margin: '0' } });
  $.ui.rule({ id: 'library-sidebar-resizer', target: { page: 'LibraryPage', name: 'SidebarResizer' }, set: { margin: '0' } });
  $.ui.rule({ id: 'library-sidebar-list', target: { page: 'LibraryPage', name: 'SidebarList' }, set: { tag: 'expanded', margin: '0', horizontalAlignment: 'Stretch' } });
  $.ui.rule({ id: 'library-sidebar-home-label', target: { page: 'LibraryPage', name: 'SidebarHomeLabel' }, set: { text: 'All games', hidden: false } });
  $.ui.rule({ id: 'library-sidebar-game-icons', target: { page: 'LibraryPage', type: 'Image', ancestor: 'GroupItemsHost', all: true }, set: { width: 24, height: 24 } });
  $.ui.rule({ id: 'library-sidebar-game-icons-rounded', target: { page: 'LibraryPage', type: 'Image', ancestor: 'GroupItemsHost', all: true }, set: { clip: 'M4,0 H20 A4,4 0 0 1 24,4 V20 A4,4 0 0 1 20,24 H4 A4,4 0 0 1 0,20 V4 A4,4 0 0 1 4,0 Z' } });
  $.ui.rule({ id: 'library-sidebar-row-rounded', target: { page: 'LibraryPage', type: 'Border', name: 'MainBorder', ancestor: 'GroupItemsHost', all: true }, set: { cornerRadius: 6, margin: '0,1,14,1' } });
  $.ui.rule({ id: 'library-sidebar-row-content-spacing', target: { page: 'LibraryPage', type: 'ContentPresenter', ancestor: 'GroupItemsHost', all: true }, set: { margin: '10,6' } });
};

const applyLibrarySections = ($: any, options: LibrarySections) => {
  applyLibrarySidebar($, options.sidebarRedesign);
  const dashboardItem = { page: 'LibraryPage', type: 'ItemsControl', ancestor: 'DashboardScroll' };
  const dashboardShelf = { page: 'LibraryPage', name: 'PART_ScrollContentPresenter', ancestor: 'DashboardScroll' };
  $.ui.rule({ id: 'library-hide-whats-new-scrollbar-track', target: { page: 'LibraryPage', name: 'PART_HorizontalScrollBar', ancestor: 'DashboardScroll', index: 1 }, set: { hidden: true } });
  $.ui.rule({ id: 'library-hide-recent-games-scrollbar-track', target: { page: 'LibraryPage', name: 'PART_HorizontalScrollBar', ancestor: 'DashboardScroll', index: 2 }, set: { hidden: true } });
  setLibraryRule($, 'library-hide-events-heading', { text: 'Events' }, !options.events);
  setLibraryRule($, 'library-hide-events-content', { ...dashboardShelf, index: 1 }, !options.events);
  setLibraryRule($, 'library-hide-events-horizontal-scroll', { page: 'LibraryPage', name: 'PART_HorizontalScrollBar', ancestor: 'DashboardScroll', index: 0 }, !options.events);

  setLibraryRule($, 'library-hide-whats-new-heading', { textContains: "What's New" }, !options.whatsNew);
  setLibraryRule($, 'library-hide-whats-new-content', { ...dashboardShelf, index: 2 }, !options.whatsNew);
  setLibraryRule($, 'library-hide-whats-new-horizontal-scroll', { page: 'LibraryPage', name: 'PART_HorizontalScrollBar', ancestor: 'DashboardScroll', index: 1 }, !options.whatsNew);

  setLibraryRule($, 'library-hide-recent-games-heading', { text: 'Recent Games' }, !options.recentGames);
  setLibraryRule($, 'library-hide-recent-games-content', { ...dashboardShelf, index: 3 }, !options.recentGames);
  setLibraryRule($, 'library-hide-recent-games-horizontal-scroll', { page: 'LibraryPage', name: 'PART_HorizontalScrollBar', ancestor: 'DashboardScroll', index: 2 }, !options.recentGames);

  setPageGridRule($, 'LibraryPage', 'library-hide-all-games-header', 'All Games', !options.allGames);
  setLibraryRule($, 'library-hide-all-games-heading', { textContains: 'All Games' }, !options.allGames);
  setLibraryRule($, 'library-hide-all-games-content', { ...dashboardItem, index: 3 }, !options.allGames);
};

const applyTopbarMode = ($: any, mode: TopbarMode) => {
  $.ui.rule({
    id: 'topbar-margin',
    target: { name: 'TopNavPanel' },
    set: { margin: '8,8,0,0' }
  });

  if (mode === 'dropdown') {
    $.ui.detach('topbar-nav-buttons');
    $.ui.undo('hide-pages-button');
    return;
  }

  $.ui.rule({
    id: 'hide-pages-button',
    target: { name: 'PagesMenuButton' },
    set: { hidden: true }
  });
  $.ui.attach({
    id: 'topbar-nav-buttons',
    anchor: 'TopNavPanel',
    placement: 'end'
  });
};

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    const savedMode = $.store.get('ui-tweaks.mode');
    if (savedMode === 'dropdown' || savedMode === 'labels' || savedMode === 'icons') {
      $.state.set(topbarMode.ref, savedMode);
    } else {
      const legacyMode = $.store.get('ui-tweaks.useIndividualButtons');
      if (legacyMode === false) {
        $.state.set(topbarMode.ref, 'dropdown');
      }
    }

    const savedHomeSections = $.store.get('ui-tweaks.homeSections');
    if (savedHomeSections && typeof savedHomeSections === 'object' && !Array.isArray(savedHomeSections)) {
      const loaded = { ...defaultHomeSections };
      for (const key of Object.keys(defaultHomeSections) as Array<keyof HomeSections>) {
        if (typeof savedHomeSections[key] === 'boolean') {
          loaded[key] = savedHomeSections[key] as boolean;
        }
      }
      $.state.set(homeSections.ref, loaded);
    }

    const savedLibrarySections = $.store.get('ui-tweaks.librarySections');
    if (savedLibrarySections && typeof savedLibrarySections === 'object' && !Array.isArray(savedLibrarySections)) {
      const loaded = { ...defaultLibrarySections };
      for (const key of Object.keys(defaultLibrarySections) as Array<keyof LibrarySections>) {
        if (typeof savedLibrarySections[key] === 'boolean') {
          loaded[key] = savedLibrarySections[key] as boolean;
        }
      }
      $.state.set(librarySections.ref, loaded);
    }

    $.modpages.add({
      id: 'ui-change-settings',
      title: 'UI Tweaks',
      icon: 'Settings24',
    });

    applyTopbarMode($, read($, topbarMode));
    return next(e);
  });

  on('session.end', ($, e, next) => {
    $.modpages.remove('ui-change-settings');
    return next(e);
  });

  on('page.navigate', ($, e, next) => {
    const result = next(e);
    $.clock.after(500, () => {
      const page = $.nav.current();
      if (page === 'HomePage' || page === 'Home') applyHomeSections($, read($, homeSections));
      if (isLibraryPage(page)) {
        applyLibrarySections($, read($, librarySections));
      }
    });
    return result;
  });

  on('ui.render', { component: 'Widget', requestId: 'topbar-nav-buttons' }, ($) => {
    const { Stack, Box, Canvas, Button, Icon, Text } = $.ui.resolve();
    const mode = read($, topbarMode);
    const compact = mode === 'icons' || (mode === 'labels' && $.window.get().width < 1200);

    return (
      <Stack
        direction="row"
        gap={compact ? 1 : 5}
        width={compact ? 180 : 620}
        height={32}
      >
        <Box
          key="nav-separator"
          width={1}
          height={18}
          margin="7,0"
          background="#1FFFFFFF"
        />
        {navItems.map(item => (
          <Canvas key={item.id} width={compact ? 32 : item.width} height={32}>
            <Button
              key={item.id + '-press'}
              tooltip={item.label}
              width={compact ? 32 : item.width}
              height={32}
              variant="transparent"
              onPress={() => $.nav.open(item.page)}
            />
            <Icon
              key={item.id + '-icon'}
              symbol={item.icon}
              size={16}
              left={8}
              top={8}
              hitTestVisible={false}
            />
            {!compact && (
              <Text
                key={item.id + '-label'}
                text={item.label}
                size={13.5}
                left={30}
                top={8}
                hitTestVisible={false}
              />
            )}
          </Canvas>
        ))}
      </Stack>
    );
  });

  on('ui.render', { component: 'Page', requestId: 'ui-change-settings' }, ($) => {
    const { Box, Text, Stack, Button, Card, Toggle } = $.ui.resolve();
    const mode = read($, topbarMode);
    const home = read($, homeSections);
    const library = read($, librarySections);
    const stackTopbarPreview = $.window.get().width < 1400;

    const chooseMode = (nextMode: TopbarMode) => {
      update($, topbarMode, () => nextMode);
      $.store.set('ui-tweaks.mode', nextMode);
      applyTopbarMode($, nextMode);
    };

    const setLibraryOption = (key: keyof LibrarySections, checked: boolean) => {
      const next = { ...library, [key]: checked };
      update($, librarySections, () => next);
      $.store.set('ui-tweaks.librarySections', next);
      applyLibrarySections($, next);
    };

    const setHomeOption = (key: keyof HomeSections, checked: boolean) => {
      const next = { ...home, [key]: checked };
      update($, homeSections, () => next);
      $.store.set('ui-tweaks.homeSections', next);
      applyHomeSections($, next);
    };

    return (
      <Box gap={12}>
        <Text text="UI Tweaks" size={30} bold={true} color="#FFFFFFFF" margin="0,0,4,0" />

        <Card>
          <Stack direction={stackTopbarPreview ? 'column' : 'row'} gap={24}>
            <Box width={stackTopbarPreview ? 520 : 560} gap={10}>
              <Text text="Top Bar" size={20} bold={true} />
              <Text text="Choose how the top navigation is displayed." size={13} color="#FF9E9E9E" />
              <Stack direction="row" gap={8} wrap={true}>
                <Button
                  key="dropdown"
                  label="Original dropdown"
                  tooltip="Use the original dropdown menu in the top bar."
                  width={160}
                  variant={mode === 'dropdown' ? 'primary' : 'secondary'}
                  onPress={() => chooseMode('dropdown')}
                />
                <Button
                  key="labels"
                  label="Buttons with text"
                  tooltip="Show the five destinations as labeled buttons. Below 1200 px, they switch to icons."
                  width={160}
                  variant={mode === 'labels' ? 'primary' : 'secondary'}
                  onPress={() => chooseMode('labels')}
                />
                <Button
                  key="icons"
                  label="Icons only"
                  tooltip="Show compact icon-only navigation buttons."
                  width={160}
                  variant={mode === 'icons' ? 'primary' : 'secondary'}
                  onPress={() => chooseMode('icons')}
                />
              </Stack>
              <Text
                text="Buttons switch to icons only below 1200 px when text mode is selected."
                size={12}
                color="#FF9E9E9E"
              />
              <Text
                text="The text layout uses about 545 px in the top bar."
                size={12}
                color="#FF9E9E9E"
              />
            </Box>
          </Stack>
        </Card>

        <Card>
          <Box gap={10}>
            <Text text="Home Page" size={20} bold={true} />
            <Text text="Choose which sections appear on the Home page." size={13} color="#FF9E9E9E" />
            <Toggle
              key="releaseBanner"
              label="Show RiShade release banner"
              checked={home.releaseBanner}
              onChange={checked => setHomeOption('releaseBanner', checked)}
            />
            <Toggle
              key="robloxNews"
              label="Show Roblox news"
              checked={home.robloxNews}
              onChange={checked => setHomeOption('robloxNews', checked)}
            />
            <Toggle
              key="catalog"
              label="Show New on the Catalog"
              checked={home.catalog}
              onChange={checked => setHomeOption('catalog', checked)}
            />
            <Toggle
              key="continuePlaying"
              label="Show Continue Playing"
              checked={home.continuePlaying}
              onChange={checked => setHomeOption('continuePlaying', checked)}
            />
          </Box>
        </Card>

        <Card>
          <Box gap={10}>
            <Text text="Library Page" size={20} bold={true} />
            <Text text="Choose which sections appear on the Library dashboard." size={13} color="#FF9E9E9E" />
            <Toggle key="library-events" label="Show Events" checked={library.events} onChange={checked => setLibraryOption('events', checked)} />
            <Toggle key="library-whats-new" label="Show What's New" checked={library.whatsNew} onChange={checked => setLibraryOption('whatsNew', checked)} />
            <Toggle key="library-recent-games" label="Show Recent Games" checked={library.recentGames} onChange={checked => setLibraryOption('recentGames', checked)} />
            <Toggle key="library-all-games" label="Show All Games" checked={library.allGames} onChange={checked => setLibraryOption('allGames', checked)} />
            <Text text="Sidebar redesign" size={16} bold={true} margin="8,4,0,0" />
            <Toggle key="library-sidebar-redesign" label="Redesign version" checked={library.sidebarRedesign} onChange={checked => setLibraryOption('sidebarRedesign', checked)} />
            <Text text="Larger rounded game icons, tighter rows, and a clear scrollbar gutter. The sidebar remains resizable." size={12} color="#FF9E9E9E" />
          </Box>
        </Card>
      </Box>
    );
  });
};
