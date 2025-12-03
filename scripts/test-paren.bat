@echo on 
echo test1 
start " "NS-LLM cmd /k echo" in "child  ; echo echo test2 ; echo where docker >nul 2>&1  ; echo if %0% equ 0 (  ; echo echo docker present  ; echo ) else (  ; echo echo docker absent  ; echo )  ; type C:\JS\ns\neuroswarm\scripts\test-paren.bat 
