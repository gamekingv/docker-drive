import { DirectiveOptions } from 'vue';

const directive: DirectiveOptions = {
  inserted(el) {
    /*@ts-ignore*/
    el.onfocus = (ev): void => ev?.target?.blur();
  }
};

export default directive;