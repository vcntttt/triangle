'use client';

export function isEditableTarget(target: EventTarget | null) {
   if (!(target instanceof HTMLElement)) {
      return false;
   }

   if (target.isContentEditable) {
      return true;
   }

   const editableParent = target.closest('[contenteditable="true"]');
   if (editableParent) {
      return true;
   }

   return Boolean(target.closest('input, textarea, select'));
}

export function hasOpenKeyboardBlockingLayer() {
   return Boolean(
      document.querySelector(
         '[role="dialog"], [data-slot="popover-content"], [data-radix-menu-content]'
      )
   );
}
