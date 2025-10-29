const fs=require('fs'),p='app/tabs/account.tsx';
let s=fs.readFileSync(p,'utf8');
if(!/type\s+RowSwitchProps\s*=/.test(s)){
  s=`type RowSwitchProps={label:string;value:boolean;onValueChange:(v:boolean)=>void}\n`+s;
}
s=s.replace(/function\s+RowSwitch\s*\(\s*\{[^)]*\}\s*:\s*\{[^)]*\}\s*\)\s*\{/m,'function RowSwitch(props:RowSwitchProps){\n  const {label,value,onValueChange}=props;');
s=s.replace(/function\s+RowSwitch\s*\(\s*\{[^)]*\}\s*:\s*RowSwitchProps\s*\)\s*\{/m,'function RowSwitch(props:RowSwitchProps){\n  const {label,value,onValueChange}=props;');
s=s.replace(/function\s+RowSwitch\s*\(\s*\{[^)]*\}\s*\)\s*\{/m,'function RowSwitch(props:RowSwitchProps){\n  const {label,value,onValueChange}=props;');
fs.writeFileSync(p,s);
