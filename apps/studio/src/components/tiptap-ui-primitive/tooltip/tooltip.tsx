"use client";

import { useRender } from "@base-ui/react/use-render";
import type { Placement } from "@floating-ui/react";
import {
  FloatingDelayGroup,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react";
import {
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  useState,
} from "react";

import "@/components/tiptap-ui-primitive/tooltip/tooltip.scss";

interface TooltipProviderProps {
  children: React.ReactNode;
  initialOpen?: boolean;
  placement?: Placement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  delay?: number;
  closeDelay?: number;
  timeout?: number;
  useDelayGroup?: boolean;
}

interface TooltipTriggerProps extends Omit<
  React.HTMLProps<HTMLElement>,
  "ref"
> {
  asChild?: boolean;
  children: React.ReactNode;
}

interface TooltipContentProps extends Omit<
  React.HTMLProps<HTMLDivElement>,
  "ref"
> {
  children?: React.ReactNode;
  portal?: boolean;
  portalProps?: Omit<React.ComponentProps<typeof FloatingPortal>, "children">;
}

type TooltipContextValue = ReturnType<typeof useTooltip>;

function useTooltip({
  initialOpen = false,
  placement = "top",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  delay = 600,
  closeDelay = 0,
}: Omit<TooltipProviderProps, "children"> = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] =
    useState<boolean>(initialOpen);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    middleware: [
      offset(4),
      flip({
        crossAxis: placement.includes("-"),
        fallbackAxisSideDirection: "start",
        padding: 4,
      }),
      shift({ padding: 4 }),
    ],
    onOpenChange: setOpen,
    open,
    placement,
    whileElementsMounted: autoUpdate,
  });

  const { context } = data;

  const hover = useHover(context, {
    delay: {
      close: closeDelay,
    },
    enabled: controlledOpen === undefined,
    mouseOnly: true,
    move: false,
    restMs: delay,
  });

  const focus = useFocus(context, {
    enabled: controlledOpen === undefined,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data]
  );
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = useContext(TooltipContext);

  if (context === null) {
    throw new Error(
      "Tooltip components must be wrapped in <TooltipProvider />"
    );
  }

  return context;
}

export function Tooltip({ children, ...props }: TooltipProviderProps) {
  const tooltip = useTooltip(props);

  if (props.useDelayGroup !== true) {
    return (
      <TooltipContext.Provider value={tooltip}>
        {children}
      </TooltipContext.Provider>
    );
  }

  return (
    <FloatingDelayGroup
      delay={{ close: props.closeDelay ?? 0, open: props.delay ?? 0 }}
      timeoutMs={props.timeout}
    >
      <TooltipContext.Provider value={tooltip}>
        {children}
      </TooltipContext.Provider>
    </FloatingDelayGroup>
  );
}

export function TooltipTrigger({
  children,
  asChild = false,
  ref,
  ...props
}: TooltipTriggerProps & { ref?: React.Ref<HTMLElement> }) {
  const context = useTooltipContext();
  const render = asChild && isValidElement(children) ? children : undefined;

  const referenceProps = context.getReferenceProps({
    type: "button",
    ...props,
  });

  referenceProps["data-tooltip-state"] = context.open ? "open" : "closed";

  if (render === undefined) {
    referenceProps.children = children;
  }

  return useRender({
    defaultTagName: "button",
    props: referenceProps,
    ref: [context.refs.setReference, ref ?? null],
    render,
  });
}

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ style, children, portal = true, portalProps, ...props }, propRef) => {
    const context = useTooltipContext();
    const ref = useMergeRefs([context.refs.setFloating, propRef]);

    if (!context.open) {
      return null;
    }

    const content = (
      <div
        ref={ref}
        style={{
          "--tooltip-position": context.strategy,
          "--tooltip-x": `${context.x ?? 0}px`,
          "--tooltip-y": `${context.y ?? 0}px`,
          ...style,
        }}
        {...context.getFloatingProps(props)}
        className="tiptap-tooltip"
      >
        {children}
      </div>
    );

    if (portal) {
      return <FloatingPortal {...portalProps}>{content}</FloatingPortal>;
    }

    return content;
  }
);

Tooltip.displayName = "Tooltip";

TooltipTrigger.displayName = "TooltipTrigger";

TooltipContent.displayName = "TooltipContent";
