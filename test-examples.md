# Test Examples for Keymap Converter

## Russian → English
ghbdtn → привет
rfr ltkf → как дела
ytgkj[j → неплохо
cnthfy → стерва

## English → Russian  
hello → руддщ
world → цщкдв
test → еуые
keyboard → лунищфкв

## Hebrew Examples
shalom → שלום (converted from english)
toda → תודה (thank you)
boker tov → בוקר טוב (good morning)

## Mixed Text Examples
hello мир world
привет world שלום
test еуые בדיקה

## Special Characters
!@#$%^&*()
.,;:'"?/
123456789
space test пробел

## Instructions for Testing

### VS Code Extension:
1. Open this file in VS Code
2. Select any text above
3. Press Ctrl+Shift+K
4. Choose conversion option
5. Text will be replaced and copied to clipboard

### Web Application:
1. Open index.html in browser
2. Copy any text from above
3. Paste into input field
4. Select text to see auto-conversion
5. Use layout buttons for specific conversions

## Expected Results

When converting "hello":
- To Russian: руддщ
- To Hebrew: יקדדם

When converting "привет":
- To English: ghbdtn
- To Hebrew: פרןבק‰

When converting mixed "hello мир":
- To English: hello world
- To Russian: руддщ мир
- To Hebrew: יקדדם צןר
