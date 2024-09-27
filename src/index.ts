import { getUnitRegexp } from './pixel-unit-regexp';
import { createPropListMatcher } from './prop-list-matcher';
import { OptionType, ParentExtendType, RuleType } from './types';
import {
  blacklistedSelector,
  createPxReplace,
  declarationExists,
  getUnit,
  isExclude,
  validateParams,
} from './utils';
import objectAssign from 'object-assign';

import { AtRule, Root, Rule } from 'postcss';
import postcss from 'postcss';

const defaults: Required<Omit<OptionType, 'exclude' | 'include'>> = {
  unitToConvert: 'px',
  viewportWidth: 320,
  viewportHeight: 568, // not now used; TODO: need for different units and math for different properties
  unitPrecision: 5,
  viewportUnit: 'vw',
  fontViewportUnit: 'vw', // vmin is more suitable.
  selectorBlackList: [],
  propList: ['*'],
  minPixelValue: 1,
  mediaQuery: false,
  replace: true,
  landscape: false,
  landscapeUnit: 'vw',
  landscapeWidth: 568,
  mutiDesign: false,
  mutiDesignUnit: 'vw',
  mutiDesignWidth: [
    {
      value: 750,
      mediaQuery: '(min-width: 750px)',
    },
    {
      value: 1920,
      mediaQuery: '(min-width: 1920px)',
    },
  ],
};

const ignoreNextComment = 'px-to-vw-ignore-next';
const ignorePrevComment = 'px-to-vw-ignore';

const postcssPxToViewport = (options: OptionType) => {
  const opts = objectAssign({}, defaults, options);

  const pxRegex = getUnitRegexp(opts.unitToConvert);
  const satisfyPropList = createPropListMatcher(opts.propList);
  const landscapeRules: AtRule[] = [];
  const mutiDesignRules: {
    value: number | ((filePath: string) => number | undefined);
    mediaQuery: string;
    rules: AtRule[];
  }[] = opts.mutiDesignWidth?.map((rul) => {
    return {
      ...rul,
      rules: [],
    };
  });
  // const mutiDesignRoots: {value:number,mediaQuery:string, rules:AtRule[]}[] = [];

  return {
    postcssPlugin: 'postcss-px-to-vw',
    Once(css: Root, { result }: { result: any }) {
      // @ts-ignore 补充类型
      css.walkRules((rule: RuleType) => {
        // Add exclude option to ignore some files like 'node_modules'
        const file = rule.source?.input.file || '';
        if (opts.exclude && file) {
          if (Object.prototype.toString.call(opts.exclude) === '[object RegExp]') {
            if (isExclude(opts.exclude as RegExp, file)) return;
          } else if (
            // Object.prototype.toString.call(opts.exclude) === '[object Array]' &&
            opts.exclude instanceof Array
          ) {
            for (let i = 0; i < opts.exclude.length; i++) {
              if (isExclude(opts.exclude[i], file)) return;
            }
          } else {
            throw new Error('options.exclude should be RegExp or Array.');
          }
        }

        if (blacklistedSelector(opts.selectorBlackList, rule.selector)) return;

        if (opts.landscape && !rule.parent?.params) {
          const landscapeRule = rule.clone().removeAll();
          rule.walkDecls((decl) => {
            if (decl.value.indexOf(opts.unitToConvert) === -1) return;
            if (!satisfyPropList(decl.prop)) return;
            let landscapeWidth;
            if (typeof opts.landscapeWidth === 'function') {
              const num = opts.landscapeWidth(file);
              if (!num) return;
              landscapeWidth = num;
            } else {
              landscapeWidth = opts.landscapeWidth;
            }

            landscapeRule.append(
              decl.clone({
                value: decl.value.replace(
                  pxRegex,
                  createPxReplace(opts, opts.landscapeUnit, landscapeWidth),
                ),
              }),
            );
          });

          if (landscapeRule.nodes.length > 0) {
            landscapeRules.push((landscapeRule as unknown) as AtRule);
          }
        }

        if (opts.mutiDesign && !rule.parent?.params) {
          const mutiDesignRule = options.mutiDesignWidth?.map((rul) => {
            return {
              ...rul,
              rules: rule.clone().removeAll(),
            };
          });
          rule.walkDecls((decl) => {
            if (decl.value.indexOf(opts.unitToConvert) === -1) return;
            if (!satisfyPropList(decl.prop)) return;
            options.mutiDesignWidth?.forEach((item) => {
              let width;
              if (typeof item.value === 'function') {
                const num = item.value(file);
                if (!num) return;
                width = num;
              } else {
                width = item.value;
              }
              mutiDesignRule
                ?.find((mu) => mu.value === item.value)
                ?.rules.append(
                  decl.clone({
                    value: decl.value.replace(
                      pxRegex,
                      createPxReplace(opts, opts.mutiDesignUnit, width),
                    ),
                  }),
                );
            });
          });
          mutiDesignRule?.forEach((ru) => {
            if (ru.rules.nodes.length > 0) {
              mutiDesignRules
                .find((ri) => ri.value === ru.value)
                ?.rules.push((ru.rules as unknown) as AtRule);
            }
          });
        }

        if (!validateParams(rule.parent?.params, opts.mediaQuery)) return;

        rule.walkDecls((decl, i) => {
          if (decl.value.indexOf(opts.unitToConvert) === -1) return;
          if (!satisfyPropList(decl.prop)) return;

          const prev = decl.prev();
          // prev declaration is ignore conversion comment at same line
          if (prev && prev.type === 'comment' && prev.text === ignoreNextComment) {
            // remove comment
            prev.remove();
            return;
          }
          const next = decl.next();
          // next declaration is ignore conversion comment at same line
          if (next && next.type === 'comment' && next.text === ignorePrevComment) {
            if (/\n/.test(next.raws.before!)) {
              result.warn(
                `Unexpected comment /* ${ignorePrevComment} */ must be after declaration at same line.`,
                { node: next },
              );
            } else {
              // remove comment
              next.remove();
              return;
            }
          }

          let unit;
          let size;
          const { params } = rule.parent;

          if (opts.landscape && params && params.indexOf('landscape') !== -1) {
            unit = opts.landscapeUnit;

            if (typeof opts.landscapeWidth === 'function') {
              const num = opts.landscapeWidth(file);
              if (!num) return;
              size = num;
            } else {
              size = opts.landscapeWidth;
            }
          } else {
            unit = getUnit(decl.prop, opts);
            if (typeof opts.viewportWidth === 'function') {
              const num = opts.viewportWidth(file);
              if (!num) return;
              size = num;
            } else {
              size = opts.viewportWidth;
            }
          }

          const value = decl.value.replace(pxRegex, createPxReplace(opts, unit!, size));

          if (declarationExists((decl.parent as unknown) as ParentExtendType[], decl.prop, value))
            return;

          if (opts.replace) {
            decl.value = value;
          } else {
            decl.parent?.insertAfter(i, decl.clone({ value }));
          }
        });
      });
    },

    OnceExit(css: Root, { AtRule }: { AtRule: any }) {
      // 在 Once里跑这段逻辑，设置横屏时，打包后到生产环境竖屏样式会覆盖横屏样式，所以 OnceExit再执行。
      if (landscapeRules.length > 0) {
        const landscapeRoot = new AtRule({
          params: '(orientation: landscape)',
          name: 'media',
        });

        landscapeRules.forEach(function(rule) {
          landscapeRoot.append(rule);
        });
        css.append(landscapeRoot);
      }
      mutiDesignRules.forEach((item) => {
        const mutiDesignRoot = new AtRule({
          params: item.mediaQuery,
          name: 'media',
        });
        item.rules.forEach(function(rule) {
          mutiDesignRoot.append(rule);
        });
        css.append(mutiDesignRoot);
      });
    },
  };
};

postcssPxToViewport.postcss = true;
module.exports = postcssPxToViewport;
export default postcssPxToViewport;
